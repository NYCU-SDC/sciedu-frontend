import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";

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

    const pageRequests = useMemo(
        () => [...coursePageRequests].sort((a, b) => a.pageIndex - b.pageIndex),
        []
    );
    const currentPage = pageRequests[currentIndex];

    useDocumentTitle("基因");

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
