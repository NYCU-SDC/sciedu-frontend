import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router";

import { api } from "../../../shared/utils/api";
import { useDocumentTitle } from "../../../shared/hooks";
import { generateRQRequestFromPage } from "./services/fetchPageContent";
import { fetchAnswerResult } from "./services/fetchAnswerResult";
import {
    loadCourseAttempt,
    saveCourseAttempt,
    type CourseAttempt,
} from "./services/courseAttempt";

import styles from "./GeneticsCourse.module.css";
import Navbar from "./components/Navbar";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";
import {
    useCourseChatController,
    type CourseChatController,
} from "./components/useCourseChatController";

import { coursePageRequests } from "./assets/courseResource";
import type {
    AnswerReviewState,
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
    SubmittedAnswerResponse,
} from "./types/types";

const COURSE_TITLE = "生物遺傳機制推理學習";
const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PageContentProps = {
    data: CoursePageRequest;
    chat: CourseChatController;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
    onAnswersSubmitted: (answers: SubmittedAnswerResponse[]) => void;
    reviewMode: boolean;
    reviewStates: Record<string, AnswerReviewState>;
    isLastPage: boolean;
};

type CoursePageProps = PageContentProps & {
    isActive: boolean;
};

function CoursePage({
    isActive,
    data,
    answers,
    isCompleted,
    onNext,
    onAnswerChange,
    onAnswersSubmitted,
    reviewMode,
    reviewStates,
    isLastPage,
}: Omit<CoursePageProps, "chat">) {
    // Keep one controller mounted for each page so every page owns an
    // independent chat session and retains it while the student navigates.
    const chat = useCourseChatController();

    return (
        <section
            className={styles.pageSlot}
            hidden={!isActive}
            aria-hidden={!isActive}
        >
            <PageContent
                data={data}
                chat={chat}
                answers={answers}
                isCompleted={isCompleted}
                onNext={onNext}
                onAnswerChange={onAnswerChange}
                onAnswersSubmitted={onAnswersSubmitted}
                reviewMode={reviewMode}
                reviewStates={reviewStates}
                isLastPage={isLastPage}
            />
        </section>
    );
}

function PageContent({
    data,
    chat,
    answers,
    isCompleted,
    onNext,
    onAnswerChange,
    onAnswersSubmitted,
    reviewMode,
    reviewStates,
    isLastPage,
}: PageContentProps) {
    switch (data.request.type) {
        case "material":
            return (
                <Material
                    data={data}
                    chat={chat}
                    answers={answers}
                    isCompleted={isCompleted}
                    onNext={onNext}
                    onAnswerChange={onAnswerChange}
                    onAnswersSubmitted={onAnswersSubmitted}
                    reviewMode={reviewMode}
                    reviewStates={reviewStates}
                    isLastPage={isLastPage}
                />
            );
        case "questions":
            return (
                <Questions
                    data={data}
                    chat={chat}
                    answers={answers}
                    isCompleted={isCompleted}
                    onNext={onNext}
                    onAnswerChange={onAnswerChange}
                    onAnswersSubmitted={onAnswersSubmitted}
                    reviewMode={reviewMode}
                    reviewStates={reviewStates}
                    isLastPage={isLastPage}
                />
            );
        case "overview":
            return (
                <Overview
                    data={data}
                    chat={chat}
                    onNext={onNext}
                    reviewMode={reviewMode}
                    isLastPage={isLastPage}
                />
            );
        default:
            return null;
    }
}

export default function GeneticsCourse() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const reviewMode = searchParams.get("mode") === "review";
    const navigationAttempt = (
        location.state as { attempt?: CourseAttempt } | null
    )?.attempt;

    if (!id) return null;

    return (
        <CoursePlayer
            key={`${id}-${reviewMode ? "review" : "answer"}`}
            courseId={id}
            reviewMode={reviewMode}
            navigationAttempt={navigationAttempt}
        />
    );
}

function CoursePlayer({
    courseId,
    reviewMode,
    navigationAttempt,
}: {
    courseId: string;
    reviewMode: boolean;
    navigationAttempt?: CourseAttempt;
}) {
    const pageRequests = useMemo(
        () => [...coursePageRequests].sort((a, b) => a.pageIndex - b.pageIndex),
        []
    );
    const storedAttempt = useMemo(
        () =>
            reviewMode
                ? navigationAttempt?.courseId === courseId
                    ? navigationAttempt
                    : loadCourseAttempt(courseId)
                : null,
        [courseId, navigationAttempt, reviewMode]
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(
        reviewMode ? pageRequests.length - 1 : 0
    );
    const [completedQuestionPages, setCompletedQuestionPages] = useState(
        () =>
            new Set<number>(
                reviewMode
                    ? pageRequests
                          .filter((page) => page.request.type !== "overview")
                          .map((page) => page.pageIndex)
                    : []
            )
    );
    const [answersByPage, setAnswersByPage] = useState<
        Record<number, CourseAnswers>
    >(() => storedAttempt?.answersByPage ?? {});
    const [submissions, setSubmissions] = useState<SubmittedAnswerResponse[]>(
        () => storedAttempt?.submissions ?? []
    );
    const submissionsRef = useRef(submissions);
    const startedAtRef = useRef(new Date().toISOString());
    const queryClient = useQueryClient();
    const posthog = usePostHog();
    const navigate = useNavigate();
    const currentPage = pageRequests[currentIndex];
    const courseMetadataQuery = useQuery({
        queryKey: ["courses", courseId, "summary-metadata"],
        queryFn: () =>
            api<{ title: string }>(
                `/api/courses/${encodeURIComponent(courseId)}`
            ),
        enabled: UUID_PATTERN.test(courseId),
        retry: false,
    });
    const courseTitle = courseMetadataQuery.data?.title ?? COURSE_TITLE;

    const resultQueries = useQueries({
        queries: (reviewMode ? submissions : []).map((submission) => ({
            queryKey: ["answer-result", submission.questionId, submission.id],
            queryFn: () =>
                fetchAnswerResult(submission.questionId, submission.id),
        })),
    });
    const reviewStates = useMemo(() => {
        const states: Record<string, AnswerReviewState> = {};
        Object.values(answersByPage).forEach((answers) => {
            Object.keys(answers).forEach((questionId) => {
                states[questionId] = {
                    isLoading: false,
                    isError: false,
                    isUnavailable: true,
                };
            });
        });
        submissions.forEach((submission, index) => {
            states[submission.questionId] = {
                result: resultQueries[index]?.data,
                isLoading: resultQueries[index]?.isFetching ?? false,
                isError: resultQueries[index]?.isError ?? false,
                isUnavailable: false,
            };
        });
        return states;
    }, [answersByPage, resultQueries, submissions]);
    const hasResultError = resultQueries.some((query) => query.isError);

    useDocumentTitle(reviewMode ? `${courseTitle}－作答檢視` : courseTitle);

    const currentYear = new Date().getFullYear();

    // Prefetch next page content when currentIndex changes
    useEffect(() => {
        const nextPage = pageRequests[currentIndex + 1];
        if (!nextPage) return;
        const nextPageRequests = generateRQRequestFromPage(nextPage);
        nextPageRequests.forEach((req) =>
            queryClient.prefetchQuery({
                queryKey: req.queryKey,
                queryFn: () => api<unknown>(req.queryPath),
            })
        );
    }, [pageRequests, currentIndex, queryClient]);

    if (reviewMode && !storedAttempt) {
        return (
            <main
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <div>
                    <h1>找不到可檢視的作答紀錄</h1>
                    <p>請從完成教材後的摘要頁進入作答檢視。</p>
                    <button type="button" onClick={() => navigate("/courses")}>
                        返回教材首頁
                    </button>
                </div>
            </main>
        );
    }

    const handleNext = () => {
        if (currentIndex === pageRequests.length - 1) {
            if (reviewMode) {
                navigate("/courses");
                return;
            }

            const attempt: CourseAttempt = {
                courseId,
                courseTitle,
                startedAt: startedAtRef.current,
                completedAt: new Date().toISOString(),
                answersByPage,
                submissions: submissionsRef.current,
            };
            saveCourseAttempt(attempt);
            navigate(
                `/courses/summary?courseId=${encodeURIComponent(courseId)}`,
                { state: { attempt } }
            );
            return;
        }

        const nextIndex = Math.min(
            currentIndex + 1,
            reviewMode ? pageRequests.length - 1 : highestUnlockedIndex + 1,
            pageRequests.length - 1
        );

        posthog.capture("course_page_advanced", {
            from_page_index: currentIndex,
            to_page_index: nextIndex,
            page_type: currentPage.request.type,
            total_pages: pageRequests.length,
        });

        setHighestUnlockedIndex((previousIndex) =>
            Math.max(previousIndex, nextIndex)
        );
        setCurrentIndex(nextIndex);
    };

    const handlePageComplete = () => {
        if (currentPage.request.type !== "overview") {
            setCompletedQuestionPages((previousPages) => {
                const nextPages = new Set(previousPages);
                nextPages.add(currentPage.pageIndex);
                return nextPages;
            });
        }
        handleNext();
    };

    const handleStepChange = (step: number) => {
        const isOutsideCourse = step < 0 || step >= pageRequests.length;
        const isLocked = !reviewMode && step > highestUnlockedIndex;

        if (isOutsideCourse || isLocked) return;

        posthog.capture("course_page_navigated", {
            from_page_index: currentIndex,
            to_page_index: step,
            total_pages: pageRequests.length,
        });
        setCurrentIndex(step);
    };

    const handleAnswerChange = (
        pageIndex: number,
        questionId: string,
        answer: CourseAnswer
    ) => {
        setAnswersByPage((previousAnswersByPage) => ({
            ...previousAnswersByPage,
            [pageIndex]: {
                ...previousAnswersByPage[pageIndex],
                [questionId]: answer,
            },
        }));
    };

    const handleAnswersSubmitted = (submitted: SubmittedAnswerResponse[]) => {
        const byQuestionId = new Map(
            submissionsRef.current.map((answer) => [answer.questionId, answer])
        );
        submitted.forEach((answer) =>
            byQuestionId.set(answer.questionId, answer)
        );
        submissionsRef.current = [...byQuestionId.values()];
        setSubmissions(submissionsRef.current);
    };

    return (
        <div
            className={`${styles.courseContainer} ${currentIndex === 0 ? styles.hasGradient : ""}`}
        >
            {/*mobile blocker*/}
            <div className={styles.mobileBlocker}>
                <div className={styles.blockerIcon}>
                    <div className={styles.phoneShape}>
                        <div className={styles.phoneLine}></div>
                    </div>
                </div>
                <h2>本教材尚未支援用手機觀看</h2>
                <p>
                    教材皆為特定螢幕比例排版
                    <br />
                    請於平板/電腦螢幕上檢視此教材
                </p>
            </div>

            {/* Main content*/}
            <div className={styles.courseWrapper}>
                <Navbar
                    activeTitles={currentPage.activeNavbarTitles}
                    activeStep={currentIndex}
                    highestUnlockedStep={
                        reviewMode
                            ? pageRequests.length - 1
                            : highestUnlockedIndex
                    }
                    secondaryTitle={currentPage.secondaryTitle}
                    onStepChange={handleStepChange}
                />
                {reviewMode && hasResultError && (
                    <div role="alert" style={{ padding: "0.75rem 1.5rem" }}>
                        部分評分載入失敗。
                        <button
                            type="button"
                            onClick={() => {
                                resultQueries.forEach((query) => {
                                    if (query.isError) void query.refetch();
                                });
                            }}
                        >
                            重新載入
                        </button>
                    </div>
                )}
                {pageRequests
                    .slice(
                        0,
                        reviewMode
                            ? pageRequests.length
                            : highestUnlockedIndex + 1
                    )
                    .map((page, index) => (
                        <CoursePage
                            key={page.pageIndex}
                            isActive={index === currentIndex}
                            data={page}
                            answers={answersByPage[page.pageIndex] ?? {}}
                            isCompleted={completedQuestionPages.has(
                                page.pageIndex
                            )}
                            onNext={handlePageComplete}
                            onAnswerChange={(questionId, answer) =>
                                handleAnswerChange(
                                    page.pageIndex,
                                    questionId,
                                    answer
                                )
                            }
                            onAnswersSubmitted={handleAnswersSubmitted}
                            reviewMode={reviewMode}
                            reviewStates={reviewStates}
                            isLastPage={index === pageRequests.length - 1}
                        />
                    ))}
                {/* copyright footer */}
                <footer className={styles.copyrightFooter}>
                    ©{currentYear} Institute of Education, Science Education
                    division, NYCU. All Rights Reserved
                </footer>
            </div>
        </div>
    );
}
