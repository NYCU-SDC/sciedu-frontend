import styles from "./Navbar.module.css";
import type { JSX } from "react/jsx-runtime";
import { SectionTitles } from "../../../../assets/NavbarContent";

type Props = {
    activeTitles: number[];
    activeStep: number;
    secondaryTitle: string;
    totalSteps: number;
    unlockedStep: number;
    onStepSelect: (step: number) => void;
};

export default function Navbar({
    activeTitles,
    activeStep,
    secondaryTitle,
    totalSteps,
    unlockedStep,
    onStepSelect,
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
                            {Array.from({ length: totalSteps }, (_, step) => (
                                <button
                                    key={step}
                                    type="button"
                                    className={
                                        activeStep === step
                                            ? styles.activeNum
                                            : ""
                                    }
                                    disabled={step > unlockedStep}
                                    aria-label={`前往第 ${step + 1} 頁`}
                                    aria-current={
                                        activeStep === step ? "page" : undefined
                                    }
                                    onClick={() => onStepSelect(step)}
                                >
                                    {String(step + 1).padStart(2, "0")}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
