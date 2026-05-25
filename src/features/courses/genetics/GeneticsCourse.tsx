import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api } from "../../../shared/utils/api";
import { generateRQRequestFromPage } from "./services/fetchPageContent";

import styles from "./GeneticsCourse.module.css";
import Navbar from "./components/Navbar";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";

import { coursePageRequests } from "./assets/courseResource";
import type { CoursePageRequest } from "./types/types";

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
    const [currentIndex, setCurrentIndex] = useState(0);
    const queryClient = useQueryClient();

    const pageRequests = useMemo(
        () => [...coursePageRequests].sort((a, b) => a.pageIndex - b.pageIndex),
        []
    );
    const currentPage = pageRequests[currentIndex];

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
        const nextIndex = Math.min(currentIndex + 1, pageRequests.length - 1);
        setCurrentIndex(nextIndex);
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
                    secondaryTitle={currentPage.secondaryTitle}
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
