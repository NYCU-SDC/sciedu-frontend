import { type JSX } from "react";
import { useState } from "react";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";
import { courseContent } from "../../../assets/CourseContent";
import "./GeneticsCourse.css";
import Navbar from "./components/Navbar";

function GeneticsCourse(): JSX.Element {
    const [currentIndex, setCurrentIndex] = useState(() => 0);
    const currentData = courseContent[currentIndex];

    const handleNext = () => {
        if (currentIndex < courseContent.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const renderStep = () => {
        switch (currentData.type) {
            case "material":
                return <Material data={currentData} onNext={handleNext} />;
            case "questions":
                return <Questions data={currentData} onNext={handleNext} />;
            case "overview":
                return <Overview data={currentData} onNext={handleNext} />;
            default:
                return null;
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
                <Navbar activeStep={currentIndex} />
                {renderStep()}
            </div>
            {/* copyright footer */}
            <footer className="copyright-footer">
                ©2024 Institute of Education, Science Education division, NYCU.
                All Rights Reserved
            </footer>
        </div>
    );
}

export default GeneticsCourse;
