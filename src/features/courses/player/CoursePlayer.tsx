import CourseContentModal from "../genetics/components/CourseContentModal";
import {
    CCM_NOTICE,
    DEFAULT_CCM_STATES,
    type CCMSimulationStates,
} from "./presentation";
import { resolveAnswerReferences, type AnswerRow } from "./answerReferences";
import { prepareMaterialMessage } from "../chat/prepareMaterialMessage";
import {
    backendEnvironment,
    CCM_CODE,
    CCM_PRESET,
} from "../../../shared/network/materialChat";
import { DEFAULT_SIMULATION_STATE, type SimulationState } from "./presentation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { useNavigate } from "react-router";

import {
    PLAYER_SESSION_PREFIX,
    readPlayerSession,
    writePlayerSession,
} from "./playerSession";
import { api } from "../../../shared/utils/api";
import { useDocumentTitle } from "../../../shared/hooks";
import { generateRQRequestFromPage } from "../genetics/services/fetchPageContent";
import styles from "../genetics/GeneticsCourse.module.css";
import Navbar from "../genetics/components/Navbar";
import Material from "../genetics/layouts/Material";
import Overview from "../genetics/layouts/Overview";
import Questions from "../genetics/layouts/Questions";
import {
    useCourseChatController,
    type CourseChatController,
} from "../genetics/components/useCourseChatController";
import type {
    CourseAnswer,
    CourseAnswers,
    CourseDefinition,
    CoursePageRequest,
    CourseReviews,
    SubmittedAnswerResponse,
} from "../genetics/types/types";

import type { CourseChatScope } from "../../../shared/auth/courseChatStorage";

type PageContentProps = {
    prepareMessage?: (text: string) => Promise<string>;
    data: CoursePageRequest;
    chat: CourseChatController;
    isActive: boolean;
    previousAnswer?: string;
    simulationState: SimulationState;
    ccmSimulationStates: CCMSimulationStates;
    onCCMSimulationChange: (states: CCMSimulationStates) => void;
    answerRows?: AnswerRow[];
    onSimulationChange: (state: SimulationState) => void;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
    reviewMode: boolean;
    reviews: CourseReviews;
    isLastPage: boolean;
    onAnswersSubmitted: (answers: SubmittedAnswerResponse[]) => void;
};

function CoursePage({
    isActive,
    chatScope,
    chatTitle,
    ...props
}: Omit<PageContentProps, "chat"> & {
    isActive: boolean;
    chatScope?: CourseChatScope;
    chatTitle: string;
}) {
    const noChat =
        props.data.request.type === "material" &&
        props.data.request.presentation?.chatEnabled === false;
    return (
        <section
            className={styles.pageSlot}
            hidden={!isActive}
            aria-hidden={!isActive}
        >
            {noChat ? (
                <Material {...props} isActive={isActive} />
            ) : (
                <PageWithChat
                    {...props}
                    isActive={isActive}
                    chatScope={chatScope}
                    chatTitle={chatTitle}
                />
            )}
        </section>
    );
}

function PageWithChat({
    chatScope,
    chatTitle,
    ...props
}: Omit<PageContentProps, "chat"> & {
    chatScope?: CourseChatScope;
    chatTitle: string;
}) {
    const chat = useCourseChatController(
        chatScope,
        chatTitle,
        props.isActive,
        props.prepareMessage
    );
    return <PageContent {...props} chat={chat} />;
}

function PageContent(props: PageContentProps) {
    switch (props.data.request.type) {
        case "material":
            return <Material {...props} />;
        case "questions":
            return <Questions {...props} />;
        case "overview":
            return (
                <Overview
                    data={props.data}
                    chat={props.chat}
                    onNext={props.onNext}
                    reviewMode={props.reviewMode}
                    isLastPage={props.isLastPage}
                />
            );
        default:
            return null;
    }
}

export type CoursePlayerProps = {
    definition: CourseDefinition;
    chatScope?: Omit<CourseChatScope, "pageId">;
    reviewMode?: boolean;
    reviews?: CourseReviews;
    initialAnswers?: Record<number, CourseAnswers>;
    onComplete?: (completion: CourseCompletion) => void;
};

export type CourseCompletion = {
    answersByPage: Record<number, CourseAnswers>;
    submissions: SubmittedAnswerResponse[];
    startedAt: string;
    completedAt: string;
};

/** A reusable player for either API-backed or locally defined courses. */
export default function CoursePlayer({
    definition,
    chatScope,
    reviewMode = false,
    reviews = {},
    initialAnswers = {},
    onComplete,
}: CoursePlayerProps) {
    const storageKey =
        !reviewMode && chatScope
            ? PLAYER_SESSION_PREFIX +
              JSON.stringify([
                  backendEnvironment(),
                  chatScope.account,
                  chatScope.experimentId,
                  chatScope.courseId,
              ])
            : null;
    const revision = JSON.stringify(
        definition.pages.map((page) => [
            page.pageId ?? page.pageIndex,
            page.secondaryTitle,
            page.request,
        ])
    );
    const [restored] = useState(() =>
        readPlayerSession(storageKey, revision, definition.pages.length)
    );
    const [currentIndex, setCurrentIndex] = useState(
        restored?.currentIndex ?? 0
    );
    const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(
        restored?.highestUnlockedIndex ?? 0
    );
    const [completedQuestionPages, setCompletedQuestionPages] = useState(
        new Set<number>(restored?.completed ?? [])
    );
    const [answersByPage, setAnswersByPage] = useState<
        Record<number, CourseAnswers>
    >(restored?.answersByPage ?? initialAnswers);
    const [simulationState, setSimulationState] = useState<SimulationState>(
        restored?.simulationState ?? DEFAULT_SIMULATION_STATE
    );
    const [ccmSimulationStates, setCCMSimulationStates] =
        useState<CCMSimulationStates>({
            ...DEFAULT_CCM_STATES,
            ...restored?.ccmSimulationStates,
        });
    const [dismissedNotices, setDismissedNotices] = useState<string[]>(
        restored?.dismissedNotices ?? []
    );
    const [confirmedAnswers, setConfirmedAnswers] = useState<
        SubmittedAnswerResponse[]
    >(restored?.submissions ?? []);
    const submissionsRef = useRef<SubmittedAnswerResponse[]>(
        restored?.submissions ?? []
    );
    const startedAtRef = useRef(
        restored?.startedAt ?? new Date().toISOString()
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) containerRef.current.scrollTop = 0;
    }, [currentIndex]);

    const queryClient = useQueryClient();
    const posthog = usePostHog();
    const navigate = useNavigate();
    const pageRequests = useMemo(
        () =>
            [...definition.pages].sort(
                (left, right) => left.pageIndex - right.pageIndex
            ),
        [definition.pages]
    );
    const currentPage = pageRequests[currentIndex];

    useDocumentTitle(definition.title);
    useEffect(() => {
        writePlayerSession(storageKey, revision, {
            currentIndex,
            highestUnlockedIndex,
            completed: [...completedQuestionPages],
            answersByPage,
            submissions: submissionsRef.current,
            startedAt: startedAtRef.current,
            simulationState,
            ccmSimulationStates,
            dismissedNotices,
        });
    }, [
        storageKey,
        revision,
        currentIndex,
        highestUnlockedIndex,
        completedQuestionPages,
        answersByPage,
        simulationState,
        ccmSimulationStates,
        dismissedNotices,
    ]);

    useEffect(() => {
        const nextPage = pageRequests[currentIndex + 1];
        if (!nextPage) return;
        generateRQRequestFromPage(nextPage).forEach((request) =>
            queryClient.prefetchQuery({
                queryKey: request.queryKey,
                queryFn: () => api<unknown>(request.queryPath),
            })
        );
    }, [pageRequests, currentIndex, queryClient]);

    if (!currentPage) {
        return <CourseStatus message="找不到教材內容" isError />;
    }

    const handleNext = () => {
        if (currentIndex === pageRequests.length - 1) {
            if (!reviewMode && onComplete) {
                onComplete({
                    answersByPage,
                    submissions: submissionsRef.current,
                    startedAt: startedAtRef.current,
                    completedAt: new Date().toISOString(),
                });
                return;
            }
            navigate(
                reviewMode
                    ? "/courses"
                    : `/courses/summary?courseId=${encodeURIComponent(definition.id)}`
            );
            return;
        }
        const nextIndex = Math.min(
            currentIndex + 1,
            reviewMode ? pageRequests.length - 1 : highestUnlockedIndex + 1,
            pageRequests.length - 1
        );
        posthog.capture("course_page_advanced", {
            course_id: definition.id,
            from_page_index: currentIndex,
            to_page_index: nextIndex,
            page_type: currentPage.request.type,
            total_pages: pageRequests.length,
        });
        setHighestUnlockedIndex((previous) => Math.max(previous, nextIndex));
        setCurrentIndex(nextIndex);
    };

    const handlePageComplete = () => {
        if (currentPage.request.type !== "overview") {
            setCompletedQuestionPages((previous) => {
                const next = new Set(previous);
                next.add(currentPage.pageIndex);
                return next;
            });
        }
        handleNext();
    };

    const handleStepChange = (step: number) => {
        if (
            step < 0 ||
            step >= pageRequests.length ||
            (!reviewMode && step > highestUnlockedIndex)
        ) {
            return;
        }
        posthog.capture("course_page_navigated", {
            course_id: definition.id,
            from_page_index: currentIndex,
            to_page_index: step,
            total_pages: pageRequests.length,
        });
        setCurrentIndex(step);
    };

    const unlockedIndex = reviewMode
        ? pageRequests.length - 1
        : highestUnlockedIndex;
    const currentYear = new Date().getFullYear();

    return (
        <div
            ref={containerRef}
            className={`${styles.courseContainer} ${currentIndex === 0 ? styles.hasGradient : ""} ${currentPage.request.type === "material" ? styles.responsiveMaterial : ""}`}
        >
            {currentPage.request.type === "material" &&
                currentPage.request.presentation?.notice && (
                    <CourseContentModal
                        opened={
                            !reviewMode &&
                            currentPage.request.type === "material" &&
                            currentPage.request.presentation?.notice ===
                                "ccm-linear-test" &&
                            !dismissedNotices.includes("ccm-linear-test")
                        }
                        title="Mental Set 2"
                        onClose={() =>
                            setDismissedNotices((previous) => [
                                ...previous,
                                "ccm-linear-test",
                            ])
                        }
                    >
                        <p>{CCM_NOTICE}</p>
                    </CourseContentModal>
                )}
            <div className={styles.mobileBlocker}>
                <div className={styles.blockerIcon}>
                    <div className={styles.phoneShape}>
                        <div className={styles.phoneLine} />
                    </div>
                </div>
                <h2>本教材尚未支援用手機觀看</h2>
                <p>
                    教材皆為特定螢幕比例排版
                    <br />
                    請於平板/電腦螢幕上檢視此教材
                </p>
            </div>
            <div className={styles.courseWrapper}>
                <Navbar
                    activeTitles={currentPage.activeNavbarTitles}
                    activeStep={currentIndex}
                    highestUnlockedStep={unlockedIndex}
                    secondaryTitle={currentPage.secondaryTitle}
                    onStepChange={handleStepChange}
                    navigation={definition.navigation}
                    stepLabels={pageRequests.map((page) => page.secondaryTitle)}
                />
                {pageRequests.slice(0, unlockedIndex + 1).map((page, index) => (
                    <CoursePage
                        key={JSON.stringify([
                            backendEnvironment(),
                            chatScope?.account,
                            chatScope?.experimentId,
                            definition.id,
                            page.pageId ?? page.pageIndex,
                        ])}
                        isActive={index === currentIndex}
                        chatScope={
                            chatScope
                                ? {
                                      ...chatScope,
                                      profile:
                                          definition.code === CCM_CODE
                                              ? `${CCM_PRESET}:material-context-v2`
                                              : undefined,
                                      pageId:
                                          page.pageId ??
                                          `legacy:${page.pageIndex}`,
                                  }
                                : undefined
                        }
                        chatTitle={`${definition.title} · ${page.secondaryTitle}`}
                        prepareMessage={(text) =>
                            prepareMaterialMessage(text, {
                                definition,
                                page,
                                scope: chatScope
                                    ? {
                                          ...chatScope,
                                          pageId:
                                              page.pageId ??
                                              `legacy:${page.pageIndex}`,
                                      }
                                    : undefined,
                                answersByPage,
                                submissions: submissionsRef.current,
                                simulation: simulationState,
                                simulations: ccmSimulationStates,
                            })
                        }
                        ccmSimulationStates={ccmSimulationStates}
                        onCCMSimulationChange={(states) =>
                            setCCMSimulationStates((previous) => ({
                                ...previous,
                                ...states,
                            }))
                        }
                        answerRows={
                            page.request.type === "material" &&
                            page.request.presentation?.answerReferences
                                ? resolveAnswerReferences(
                                      page.request.presentation
                                          .answerReferences,
                                      definition,
                                      answersByPage,
                                      confirmedAnswers,
                                      chatScope?.experimentId
                                  )
                                : undefined
                        }
                        simulationState={simulationState}
                        onSimulationChange={setSimulationState}
                        previousAnswer={
                            page.request.type === "material" &&
                            page.request.presentation
                                ?.previousAnswerPageIndex !== undefined
                                ? Object.values(
                                      answersByPage[
                                          page.request.presentation
                                              .previousAnswerPageIndex
                                      ] ?? {}
                                  ).join("\n\n")
                                : undefined
                        }
                        data={page}
                        answers={answersByPage[page.pageIndex] ?? {}}
                        isCompleted={completedQuestionPages.has(page.pageIndex)}
                        onNext={handlePageComplete}
                        onAnswerChange={(questionId, answer) =>
                            setAnswersByPage((previous) => ({
                                ...previous,
                                [page.pageIndex]: {
                                    ...previous[page.pageIndex],
                                    [questionId]: answer,
                                },
                            }))
                        }
                        reviewMode={reviewMode}
                        reviews={reviews}
                        onAnswersSubmitted={(submitted) => {
                            const byQuestion = new Map(
                                submissionsRef.current.map((answer) => [
                                    answer.questionId,
                                    answer,
                                ])
                            );
                            submitted.forEach((answer) =>
                                byQuestion.set(answer.questionId, answer)
                            );
                            submissionsRef.current = [...byQuestion.values()];
                            setConfirmedAnswers(submissionsRef.current);
                        }}
                        isLastPage={index === pageRequests.length - 1}
                    />
                ))}
                <footer className={styles.copyrightFooter}>
                    ©{currentYear} Institute of Education, Science Education
                    division, NYCU. All Rights Reserved
                </footer>
            </div>
        </div>
    );
}

export function CourseStatus({
    message,
    isError = false,
}: {
    message: string;
    isError?: boolean;
}) {
    return (
        <div className={styles.courseContainer}>
            <div className={styles.courseWrapper}>
                <p role={isError ? "alert" : "status"}>{message}</p>
            </div>
        </div>
    );
}
