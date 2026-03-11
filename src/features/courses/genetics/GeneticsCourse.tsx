import { useState } from "react";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";
import { courseContent } from "../../../assets/CourseContent";
import "./GeneticsCourse.css";
import Navbar from "./components/Navbar";
import type { CourseContent } from "./types/types";

type PageContentProps = {
    data: CourseContent;
    onNext: () => void;
};

function PageContent({ data, onNext }: PageContentProps) {
    switch (data.type) {
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
    const currentData = courseContent[currentIndex];

    const handleNext = () => {
        if (currentIndex < courseContent.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    return (
        <div
            className={`course-container ${currentIndex === 0 ? "has-gradient" : ""}`}
        >
            {/*mobile blocker*/}
            <div className="mobile-blocker">
                <div className="blocker-icon">
                    <div className="phone-shape">
                        <div className="phone-line"></div>
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
            <div className="course-wrapper">
                <Navbar
                    activeTitles={currentData.activeNavbarTitles}
                    activeStep={currentIndex}
                    secondaryTitle={currentData.secondaryTitle}
                />
                <PageContent data={currentData} onNext={handleNext} />
                {/* copyright footer */}
                <footer className="copyright-footer">
                    {/*Technically breaks pureness but works without causing considerable issues*/}
                    ©{new Date().getFullYear()} Institute of Education, Science
                    Education division, NYCU. All Rights Reserved
                </footer>
            </div>
        </div>
    );
}
