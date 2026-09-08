import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { api } from "../../../shared/utils/api";
import { useDocumentTitle } from "../../../shared/hooks";
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

import { coursePageRequests } from "./assets/courseResource";
import {
    fetchCourseDefinition,
    isCourseUuid,
} from "./services/fetchCourseDefinition";
import { DEMO_MODE, getDemoCourse } from "../demo/demoCourseCatalog";
import type { DemoQuestionReview } from "../demo/demoCourseCatalog";
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
    reviewMode: boolean;
    reviews: Record<string, DemoQuestionReview>;
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
    reviewMode,
    reviews,
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
                reviewMode={reviewMode}
                reviews={reviews}
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
    reviewMode,
    reviews,
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
                    reviewMode={reviewMode}
                    reviews={reviews}
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
                    reviewMode={reviewMode}
                    reviews={reviews}
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
    const { id = "genetics" } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const reviewMode = searchParams.get("mode") === "review";
    return (
        <CoursePlayer
            key={`${id}-${reviewMode ? "review" : "answer"}`}
            courseId={id}
            reviewMode={reviewMode}
        />
    );
}

function CoursePlayer({
    courseId,
    reviewMode,
}: {
    courseId: string;
    reviewMode: boolean;
}) {
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
    const navigate = useNavigate();
    const demoCourse = getDemoCourse(courseId);
    const remoteCourse = useQuery({
        queryKey: ["course-definition", courseId],
        queryFn: () => fetchCourseDefinition(courseId),
        enabled: !DEMO_MODE && isCourseUuid(courseId),
    });
    const fallbackDefinition = {
        id: courseId,
        code: "genetics",
        title: "豌豆－種皮形狀",
        pages: coursePageRequests,
        navigation: "classic" as const,
    };
    const courseDefinition = DEMO_MODE
        ? demoCourse?.definition
        : isCourseUuid(courseId)
          ? remoteCourse.data
          : fallbackDefinition;

    const pageRequests = useMemo(
        () =>
            [...(courseDefinition?.pages ?? [])].sort(
                (a, b) => a.pageIndex - b.pageIndex
            ),
        [courseDefinition]
    );
    const currentPage = pageRequests[currentIndex];

    useDocumentTitle(courseDefinition?.title ?? "教材載入中");

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
        if (!currentPage || !courseDefinition) return;
        if (currentIndex === pageRequests.length - 1) {
            if (reviewMode) {
                navigate("/courses");
            } else {
                navigate(
                    `/courses/summary?courseId=${encodeURIComponent(courseDefinition.id ?? courseId)}`
                );
            }
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

    if (!DEMO_MODE && isCourseUuid(courseId) && remoteCourse.isLoading) {
        return <CourseStatus message="教材載入中…" />;
    }

    if (!DEMO_MODE && isCourseUuid(courseId) && remoteCourse.isError) {
        return <CourseStatus message="目前無法載入這份教材" isError />;
    }

    if (!courseDefinition || !currentPage) {
        return <CourseStatus message="找不到教材內容" isError />;
    }

    const unlockedIndex = reviewMode
        ? pageRequests.length - 1
        : highestUnlockedIndex;

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
                    highestUnlockedStep={unlockedIndex}
                    secondaryTitle={currentPage.secondaryTitle}
                    onStepChange={handleStepChange}
                    variant={courseDefinition.navigation}
                    stepLabels={pageRequests.map((page) => page.secondaryTitle)}
                />
                {pageRequests.slice(0, unlockedIndex + 1).map((page, index) => (
                    <CoursePage
                        key={page.pageIndex}
                        isActive={index === currentIndex}
                        data={page}
                        answers={answersByPage[page.pageIndex] ?? {}}
                        isCompleted={completedQuestionPages.has(page.pageIndex)}
                        onNext={handlePageComplete}
                        onAnswerChange={(questionId, answer) =>
                            handleAnswerChange(
                                page.pageIndex,
                                questionId,
                                answer
                            )
                        }
                        reviewMode={reviewMode}
                        reviews={demoCourse?.reviews ?? {}}
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

function CourseStatus({
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
