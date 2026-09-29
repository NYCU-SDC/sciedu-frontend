import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { useParams } from "react-router";

import { ApiError, api } from "../../../shared/utils/api";
import { useDocumentTitle } from "../../../shared/hooks";
import { useCurrentExperimentCourses } from "../services/currentExperimentQueries";
import { generateRQRequestFromPage } from "./services/fetchPageContent";

import styles from "./GeneticsCourse.module.css";
import Navbar from "./components/Navbar";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";
import {
    useCourseChatController,
    type CourseChatController,
} from "./components/useCourseChatController";

import {
    fetchCourseDefinition,
    isCourseUuid,
} from "./services/fetchCourseDefinition";
import type {
    CourseAnswer,
    CourseAnswers,
    CoursePageRequest,
} from "./types/types";

type PageContentProps = {
    data: CoursePageRequest;
    chat: CourseChatController;
    answers: CourseAnswers;
    isCompleted: boolean;
    onNext: () => void;
    onAnswerChange: (questionId: string, answer: CourseAnswer) => void;
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
                />
            );
        case "overview":
            return <Overview data={data} chat={chat} onNext={onNext} />;
        default:
            return null;
    }
}

export default function GeneticsCourse() {
    const { id = "" } = useParams<{ id: string }>();
    return <CoursePlayer key={id} courseId={id} />;
}

function CoursePlayer({ courseId }: { courseId: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0);
    const [completedQuestionPages, setCompletedQuestionPages] = useState(
        new Set<number>()
    );
    const [answersByPage, setAnswersByPage] = useState<
        Record<number, CourseAnswers>
    >({});
    const queryClient = useQueryClient();
    const posthog = usePostHog();
    const currentExperiment = useCurrentExperimentCourses();
    const isValidCourseId = isCourseUuid(courseId);
    const isAssignedCourse = currentExperiment.courses.some(
        (course) => course.id === courseId
    );
    const courseQuery = useQuery({
        queryKey: ["courses", courseId, "definition"],
        queryFn: () => fetchCourseDefinition(courseId),
        enabled:
            isValidCourseId &&
            !currentExperiment.isPending &&
            !currentExperiment.error &&
            currentExperiment.experiment?.status === "ACTIVE" &&
            isAssignedCourse,
        retry: (count, error) =>
            !(
                error instanceof ApiError &&
                [401, 403, 404].includes(error.status)
            ) && count < 1,
    });

    const pageRequests = useMemo(
        () =>
            [...(courseQuery.data?.pages ?? [])].sort(
                (a, b) => a.pageIndex - b.pageIndex
            ),
        [courseQuery.data?.pages]
    );
    const currentPage = pageRequests[currentIndex];

    useDocumentTitle(courseQuery.data?.title ?? "教材");

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

    const handleNext = () => {
        if (!currentPage) return;
        const nextIndex = Math.min(
            currentIndex + 1,
            highestUnlockedIndex + 1,
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
        if (!currentPage) return;
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
        const isLocked = step > highestUnlockedIndex;

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

    if (!isValidCourseId) {
        return <CourseStatus message="教材連結格式不正確" />;
    }

    if (currentExperiment.isPending) {
        return <CourseStatus message="正在確認目前實驗…" />;
    }

    if (currentExperiment.error) {
        const status =
            currentExperiment.error instanceof ApiError
                ? currentExperiment.error.status
                : undefined;
        return (
            <CourseStatus
                message={
                    status === 401
                        ? "登入狀態已失效，請重新登入"
                        : status === 403
                          ? "你沒有查看目前實驗的權限"
                          : "目前無法確認實驗教材"
                }
                onRetry={
                    status !== undefined && status < 500
                        ? undefined
                        : currentExperiment.refetch
                }
            />
        );
    }

    if (
        !currentExperiment.experiment ||
        currentExperiment.experiment.status !== "ACTIVE"
    ) {
        return <CourseStatus message="目前沒有進行中的實驗" />;
    }

    if (!isAssignedCourse) {
        return <CourseStatus message="這份教材不在目前實驗中" />;
    }

    if (courseQuery.isPending) {
        return <CourseStatus message="教材載入中…" />;
    }

    if (courseQuery.isError) {
        const status =
            courseQuery.error instanceof ApiError
                ? courseQuery.error.status
                : undefined;
        const message =
            status === 401
                ? "登入狀態已失效，請重新登入"
                : status === 403
                  ? "你沒有查看這份教材的權限"
                  : status === 404
                    ? "找不到這份教材"
                    : "目前無法載入這份教材";
        return (
            <CourseStatus
                message={message}
                onRetry={
                    status !== undefined && status < 500
                        ? undefined
                        : courseQuery.refetch
                }
            />
        );
    }

    if (!currentPage) {
        return <CourseStatus message="這份教材目前沒有可顯示的內容" />;
    }

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
                    highestUnlockedStep={highestUnlockedIndex}
                    secondaryTitle={currentPage.secondaryTitle}
                    totalSteps={pageRequests.length}
                    onStepChange={handleStepChange}
                />
                {pageRequests
                    .slice(0, highestUnlockedIndex + 1)
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

function CourseStatus({
    message,
    onRetry,
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div className={styles.courseStatus} role="status">
            <span>{message}</span>
            {onRetry && (
                <button type="button" onClick={onRetry}>
                    重新載入
                </button>
            )}
        </div>
    );
}
