import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "@posthog/react";
import { useNavigate, useParams } from "react-router";

import { api } from "../../../shared/utils/api";
import { useDocumentTitle } from "../../../shared/hooks";
import { generateRQRequestFromPage } from "./services/fetchPageContent";

import styles from "./GeneticsCourse.module.css";
import Navbar from "./components/Navbar";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";

import { courseUnits } from "./assets/courseResource";
import type { CoursePageRequest } from "./types/types";
import {
    canNavigateToPage,
    nextCourseLocation,
    selectCourseUnit,
} from "./services/courseNavigation";

type PageContentProps = {
    data: CoursePageRequest;
    onNext: () => void;
};

function PageContent({ data, onNext }: PageContentProps) {
    switch (data.request.type) {
        case "material":
            return <Material data={data} onNext={onNext} />;
        case "questions":
            return <Questions data={data} onNext={onNext} />;
        case "overview":
            return <Overview data={data} onNext={onNext} />;
        default:
            return null;
    }
}

export default function GeneticsCourse() {
    const [pageSelection, setPageSelection] = useState({
        unitId: "",
        index: 0,
    });
    const [unlockedByUnit, setUnlockedByUnit] = useState<
        Record<string, number>
    >({});
    const queryClient = useQueryClient();
    const posthog = usePostHog();
    const navigate = useNavigate();
    const { id: routeId } = useParams<{ id: string }>();

    const orderedUnits = useMemo(
        () => [...courseUnits].sort((a, b) => a.order - b.order),
        []
    );
    const currentUnit = useMemo(
        () => selectCourseUnit(orderedUnits, routeId),
        [orderedUnits, routeId]
    );
    const pageRequests = useMemo(
        () =>
            currentUnit
                ? [...currentUnit.pages].sort(
                      (a, b) => a.pageIndex - b.pageIndex
                  )
                : [],
        [currentUnit]
    );
    const currentIndex =
        pageSelection.unitId === currentUnit?.id ? pageSelection.index : 0;
    const safeIndex = Math.min(
        currentIndex,
        Math.max(pageRequests.length - 1, 0)
    );
    const currentPage = pageRequests[safeIndex];
    const unlockedStep = currentUnit
        ? (unlockedByUnit[currentUnit.id] ?? 0)
        : 0;

    useDocumentTitle("基因");

    const currentYear = new Date().getFullYear();

    // Prefetch next page content when currentIndex changes
    useEffect(() => {
        const nextPage = pageRequests[safeIndex + 1];
        if (!nextPage) return;
        const nextPageRequests = generateRQRequestFromPage(nextPage);
        nextPageRequests.forEach((req) =>
            queryClient.prefetchQuery({
                queryKey: req.queryKey,
                queryFn: () => api<unknown>(req.queryPath),
            })
        );
    }, [pageRequests, safeIndex, queryClient]);

    const handleNext = () => {
        if (!currentUnit || !currentPage) return;
        const nextIndex = Math.min(safeIndex + 1, pageRequests.length - 1);
        posthog.capture("course_page_advanced", {
            unit_id: currentUnit.id,
            from_page_index: safeIndex,
            to_page_index: nextIndex,
            page_type: currentPage.request.type,
            total_pages: pageRequests.length,
        });
        if (safeIndex < pageRequests.length - 1) {
            setUnlockedByUnit((current) => ({
                ...current,
                [currentUnit.id]: Math.max(
                    current[currentUnit.id] ?? 0,
                    nextIndex
                ),
            }));
            setPageSelection({ unitId: currentUnit.id, index: nextIndex });
            return;
        }
        const nextLocation = nextCourseLocation(
            orderedUnits,
            currentUnit.id,
            safeIndex
        );
        if (nextLocation) navigate(nextLocation);
    };

    const handleStepSelect = (step: number) => {
        if (currentUnit && canNavigateToPage(step, unlockedStep)) {
            setPageSelection({ unitId: currentUnit.id, index: step });
        }
    };

    if (!currentUnit || !currentPage) {
        return (
            <div className={styles.courseError} role="alert">
                <h1>找不到教材單元</h1>
                <p>
                    Route「{routeId ?? ""}」沒有對應的 Genetics Course
                    unit，或教材 UUID mapping 尚未產生。
                </p>
            </div>
        );
    }

    return (
        <div
            className={`${styles.courseContainer} ${safeIndex === 0 ? styles.hasGradient : ""}`}
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
                    activeStep={safeIndex}
                    secondaryTitle={currentPage.secondaryTitle}
                    totalSteps={pageRequests.length}
                    unlockedStep={unlockedStep}
                    onStepSelect={handleStepSelect}
                />
                <PageContent data={currentPage} onNext={handleNext} />
                {/* copyright footer */}
                <footer className={styles.copyrightFooter}>
                    ©{currentYear} Institute of Education, Science Education
                    division, NYCU. All Rights Reserved
                </footer>
            </div>
        </div>
    );
}
