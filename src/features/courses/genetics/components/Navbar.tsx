import styles from "./Navbar.module.css";
import type { JSX } from "react/jsx-runtime";
import { LockKeyhole } from "lucide-react";
import { SectionTitles } from "../../../../assets/NavbarContent";

type Props = {
    activeTitles: number[];
    activeStep: number;
    highestUnlockedStep: number;
    secondaryTitle: string;
    onStepChange: (step: number) => void;
    variant?: "classic" | "stepper";
    stepLabels?: string[];
};

export default function Navbar({
    activeTitles,
    activeStep,
    highestUnlockedStep,
    secondaryTitle,
    onStepChange,
    variant = "classic",
    stepLabels = [],
}: Props): JSX.Element {
    const totalSteps = variant === "stepper" ? stepLabels.length : 3;

    if (variant === "stepper") {
        return (
            <nav
                className={`${styles.courseNavbar} ${styles.stepperNavbar}`}
                aria-label="教材進度"
            >
                <div className={styles.stepperBrand}>
                    <strong>生物科學推理學習</strong>
                    <span>{secondaryTitle}</span>
                </div>
                <div className={styles.stepperTrack}>
                    {stepLabels.map((label, step) => {
                        const isActive = activeStep === step;
                        const isComplete = step < activeStep;
                        const isLocked = step > highestUnlockedStep;
                        return (
                            <button
                                key={label}
                                type="button"
                                className={`${styles.stepItem} ${isActive ? styles.stepActive : ""} ${isComplete ? styles.stepComplete : ""}`}
                                aria-current={isActive ? "page" : undefined}
                                aria-disabled={isLocked}
                                disabled={isLocked}
                                onClick={() => onStepChange(step)}
                            >
                                <span className={styles.stepCircle}>
                                    {isLocked ? (
                                        <LockKeyhole size={12} />
                                    ) : (
                                        String(step + 1).padStart(2, "0")
                                    )}
                                </span>
                                <span className={styles.stepText}>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        );
    }

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
                            {Array.from(
                                { length: totalSteps },
                                (_, step) => step
                            ).map((step) => {
                                const isActive = activeStep === step;
                                const isLocked = step > highestUnlockedStep;
                                const pageNumber = String(step + 1).padStart(
                                    2,
                                    "0"
                                );
                                const previousPageNumber = String(
                                    step
                                ).padStart(2, "0");
                                const lockedMessage = `第 ${pageNumber} 頁尚未解鎖，請先完成第 ${previousPageNumber} 頁`;

                                return (
                                    <button
                                        key={step}
                                        type="button"
                                        className={`${styles.pageButton} ${isActive ? styles.activeNum : ""} ${isLocked ? styles.lockedNum : ""}`}
                                        aria-disabled={isLocked}
                                        aria-current={
                                            isActive ? "page" : undefined
                                        }
                                        aria-label={
                                            isLocked
                                                ? lockedMessage
                                                : `前往第 ${pageNumber} 頁`
                                        }
                                        title={
                                            isLocked ? lockedMessage : undefined
                                        }
                                        onClick={() => {
                                            if (!isLocked) onStepChange(step);
                                        }}
                                    >
                                        <span>{pageNumber}</span>
                                        {isLocked && (
                                            <LockKeyhole
                                                aria-hidden="true"
                                                size={11}
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
