import "./Navbar.css";
import type { JSX } from "react/jsx-runtime";
import type { PageType } from "../types/types";

export function Navbar({ activeStep }: { activeStep: PageType }): JSX.Element {
    // 根據 activeStep 決定下方顯示的子標題與選單的高亮狀態
    const subTitles = ["", "豌豆-種皮形狀", "整合問題", "整合"];

    return (
        <nav className="course-navbar">
            <div className="navbar-container">
                {/* 左側主標題區 */}
                <div className="brand-section">生物遺傳機制推理學習</div>

                {/* 右側內容區：包含主選單、橫線與子標題 */}
                <div className="content-section">
                    <div className="main-nav-links">
                        <div
                            className={`nav-link ${activeStep === "material" ? "active" : ""}`}
                        >
                            單基因遺傳
                        </div>
                        <div className="divider">|</div>
                        <div
                            className={`nav-link ${activeStep === "questions" ? "active" : ""}`}
                        >
                            中間型及共顯性遺傳
                        </div>
                        <div className="divider">|</div>
                        <div
                            className={`nav-link ${activeStep === "overview" ? "active" : ""}`}
                        >
                            兩對基因遺傳
                        </div>
                    </div>

                    {/* 貫穿橫線 */}
                    <div className="horizontal-line"></div>

                    <div className="sub-nav-info">
                        <div className="current-subtitle">
                            {
                                subTitles[
                                    activeStep === "material"
                                        ? 1
                                        : activeStep === "questions"
                                          ? 2
                                          : 3
                                ]
                            }
                        </div>
                        {/* 右側進度數字 */}
                        <div className="page-progress">
                            <span
                                className={
                                    activeStep === "material"
                                        ? "active-num"
                                        : ""
                                }
                            >
                                01
                            </span>
                            <span className="p-divider">|</span>
                            <span
                                className={
                                    activeStep === "questions"
                                        ? "active-num"
                                        : ""
                                }
                            >
                                02
                            </span>
                            <span className="p-divider">|</span>
                            <span
                                className={
                                    activeStep === "overview"
                                        ? "active-num"
                                        : ""
                                }
                            >
                                03
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
