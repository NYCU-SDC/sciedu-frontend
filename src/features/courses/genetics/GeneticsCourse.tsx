import React, { useState } from "react";
import Material from "./layouts/Material";
import Overview from "./layouts/Overview";
import Questions from "./layouts/Questions";
import "./GeneticsCourse.css";

const GeneticsCourse: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Material onNext={() => setCurrentStep(2)} />;
            case 2:
                return <Questions onNext={() => setCurrentStep(3)} />;
            case 3:
                return <Overview onNext={() => setCurrentStep(1)} />;
            default:
                return <Material onNext={() => setCurrentStep(1)} />;
        }
    };

    return (
        <div
            className={`genetics-container ${currentStep === 1 ? "has-gradient" : ""}`}
        >
            {/* 手機版阻擋層 */}
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

            {/* 電腦版主內容 */}
            <div className="course-wrapper">{renderStep()}</div>
            {/* 頁尾版權宣告 */}
            <footer className="copyright-footer">
                ©2024 Institute of Education, Science Education division, NYCU.
                All Rights Reserved
            </footer>
        </div>
    );
};

export default GeneticsCourse;
