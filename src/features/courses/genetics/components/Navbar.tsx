import styles from "./Navbar.module.css";
import type { JSX } from "react/jsx-runtime";
import { subTitles } from "../../../../assets/NavbarContent";

export function Navbar({ activeStep }: { activeStep: number }): JSX.Element {
    return (
        <nav className={styles["course-navbar"]}>
            <div className={styles["navbar-container"]}>
                {/* Left Main Title */}
                <div className={styles["brand-section"]}>{subTitles.MainTitle}</div>
                {/* right side subtitle*/}
                <div className={styles["content-section"]}>
                    <div className={styles["main-nav-links"]}>
                        <span
                            className={`${styles["nav-link"]} ${activeStep === 0 ? styles["active"] : ""}`}
                        >
                            {subTitles.SubTitle[0]}
                        </span>
                        <span
                            className={`${styles["nav-link"]} ${activeStep === 1 ? styles["active"] : ""}`}
                        >
                            {subTitles.SubTitle[1]}
                        </span>
                        <span
                            className={`${styles["nav-link"]} ${activeStep === 2 ? styles["active"] : ""}`}
                        >
                            {subTitles.SubTitle[2]}
                        </span>
                    </div>

                    {/* Straight line */}
                    <div className={styles["horizontal-line"]}></div>

                    <div className={styles["sub-nav-info"]}>
                        <div className={styles["current-subtitle"]}>
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
                        <div className={styles["page-progress"]}>
                            <span
                                className={activeStep === 0 ? styles["active-num"] : ""}
                            >
                                01
                            </span>
                            <span
                                className={activeStep === 1 ? styles["active-num"] : ""}
                            >
                                02
                            </span>
                            <span
                                className={activeStep === 2 ? styles["active-num"] : ""}
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
