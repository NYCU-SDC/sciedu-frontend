import "./Navbar.css";
import type { JSX } from "react/jsx-runtime";
import { subTitles } from "../../../../assets/NavbarContent";

export function Navbar({ activeStep }: { activeStep: number }): JSX.Element {
    return (
        <nav className="course-navbar">
            <div className="navbar-container">
                {/* Left Main Title */}
                <div className="brand-section">{subTitles.MainTitle}</div>
                {/* right side subtitle*/}
                <div className="content-section">
                    <div className="main-nav-links">
                        <span
                            className={`nav-link ${activeStep === 0 ? "active" : ""}`}
                        >
                            {subTitles.SubTitle[0]}
                        </span>
                        <span
                            className={`nav-link ${activeStep === 1 ? "active" : ""}`}
                        >
                            {subTitles.SubTitle[1]}
                        </span>
                        <span
                            className={`nav-link ${activeStep === 2 ? "active" : ""}`}
                        >
                            {subTitles.SubTitle[2]}
                        </span>
                    </div>

                    {/* Straight line */}
                    <div className="horizontal-line"></div>

                    <div className="sub-nav-info">
                        <div className="current-subtitle">
                            {
                                subTitles.SecondTitle[
                                    activeStep === 0
                                        ? 1
                                        : activeStep === 1
                                          ? 2
                                          : 3
                                ]
                            }
                        </div>
                        {/* number of pages */}
                        <div className="page-progress">
                            <span
                                className={activeStep === 0 ? "active-num" : ""}
                            >
                                01
                            </span>
                            <span
                                className={activeStep === 1 ? "active-num" : ""}
                            >
                                02
                            </span>
                            <span
                                className={activeStep === 2 ? "active-num" : ""}
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
