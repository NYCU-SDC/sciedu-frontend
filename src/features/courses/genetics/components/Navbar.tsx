import "./Navbar.css";
import type { JSX } from "react/jsx-runtime";
import { SectionTitles } from "../../../../assets/NavbarContent";

type Props = {
    activeTitles: number[];
    activeStep: number;
    setActiveStep: (step: number) => void;
    secondaryTitle: string;
};

export function Navbar({
    activeTitles,
    activeStep,
    setActiveStep,
    secondaryTitle,
}: Props): JSX.Element {
    return (
        <nav className="course-navbar">
            <div className="navbar-container">
                {/* Left Main Title */}
                <div className="brand-section">{SectionTitles.MainTitle}</div>
                {/* right side subtitle*/}
                <div className="content-section">
                    <div className="main-nav-links">
                        {SectionTitles.SubTitle.map((title, index) => (
                            <span
                                className={`nav-link ${activeTitles.includes(index) ? "active" : ""}`}
                            >
                                {title}
                            </span>
                        ))}
                    </div>

                    {/* Straight line */}
                    <div className="horizontal-line"></div>

                    <div className="sub-nav-info">
                        <div className="current-subtitle">{secondaryTitle}</div>
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
