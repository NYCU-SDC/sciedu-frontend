import "./Navbar.css";

const Navbar = ({ activeStep }: { activeStep: number }) => {
    // 根據 activeStep 決定下方顯示的子標題與選單的高亮狀態
    const subTitles = ["", "豌豆-種皮形狀", "整合問題", "整合"];

    return (
        <nav className="genetics-navbar">
            <div className="navbar-container">
                {/* 左側主標題區 */}
                <div className="brand-section">生物遺傳機制推理學習</div>

                {/* 右側內容區：包含主選單、橫線與子標題 */}
                <div className="content-section">
                    <div className="main-nav-links">
                        <div
                            className={`nav-link ${activeStep === 1 ? "active" : ""}`}
                        >
                            單基因遺傳
                        </div>
                        <div className="divider">|</div>
                        <div
                            className={`nav-link ${activeStep === 2 ? "active" : ""}`}
                        >
                            中間型及共顯性遺傳
                        </div>
                        <div className="divider">|</div>
                        <div
                            className={`nav-link ${activeStep === 3 ? "active" : ""}`}
                        >
                            兩對基因遺傳
                        </div>
                    </div>

                    {/* 貫穿橫線 */}
                    <div className="horizontal-line"></div>

                    <div className="sub-nav-info">
                        <div className="current-subtitle">
                            {subTitles[activeStep]}
                        </div>
                        {/* 右側進度數字 */}
                        <div className="page-progress">
                            <span
                                className={activeStep === 1 ? "active-num" : ""}
                            >
                                01
                            </span>
                            <span className="p-divider">|</span>
                            <span
                                className={activeStep === 2 ? "active-num" : ""}
                            >
                                02
                            </span>
                            <span className="p-divider">|</span>
                            <span
                                className={activeStep === 3 ? "active-num" : ""}
                            >
                                03
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
