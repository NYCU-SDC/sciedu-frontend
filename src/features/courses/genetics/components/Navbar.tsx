import styles from "./Navbar.module.css";
import type { JSX } from "react/jsx-runtime";
import { SectionTitles } from "../../../../assets/NavbarContent";

type Props = {
    activeTitles: number[];
    activeStep: number;
    secondaryTitle: string;
};

export default function Navbar({
    activeTitles,
    activeStep,
    secondaryTitle,
}: Props): JSX.Element {
    return (
        <nav className={styles.courseNavbar}>
            <div className={styles.navbarContainer}>
                {/* Left Main Title */}
                <div className={styles.brandSection}>
                    {SectionTitles.MainTitle}
                </div>
                {/* right side subtitle*/}
                <div className={styles.contentSection}>
                    <div className={styles.mainNavLinks}>
                        {SectionTitles.SubTitle.map((title, index) => (
                            <span
                                key={index}
                                className={`${styles.navLink} ${activeTitles.includes(index) ? styles.navLinkActive : ""}`}
                            >
                                {title}
                            </span>
                        ))}
                    </div>

                    {/* Straight line */}
                    <div className={styles.horizontalLine}></div>

                    <div className={styles.subNavInfo}>
                        <div className={styles.currentSubtitle}>
                            {secondaryTitle}
                        </div>
                        {/* number of pages */}
                        <div className={styles.pageProgress}>
                            <span
                                className={
                                    activeStep === 0 ? styles.activeNum : ""
                                }
                            >
                                01
                            </span>
                            <span
                                className={
                                    activeStep === 1 ? styles.activeNum : ""
                                }
                            >
                                02
                            </span>
                            <span
                                className={
                                    activeStep === 2 ? styles.activeNum : ""
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
