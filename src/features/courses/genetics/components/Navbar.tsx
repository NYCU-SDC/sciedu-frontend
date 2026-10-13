import type { JSX } from "react/jsx-runtime";
import { LockKeyhole } from "lucide-react";
import type { CourseNavigation } from "../types/types";
import styles from "./Navbar.module.css";

type Props = {
    activeTitles: number[];
    activeStep: number;
    highestUnlockedStep: number;
    secondaryTitle: string;
    onStepChange: (step: number) => void;
    navigation: CourseNavigation;
    stepLabels: string[];
};

export default function Navbar({
    activeTitles,
    activeStep,
    highestUnlockedStep,
    secondaryTitle,
    onStepChange,
    navigation,
    stepLabels,
}: Props): JSX.Element {
    if (navigation.variant === "stepper") {
        return (
            <nav
                className={`${styles.courseNavbar} ${styles.stepperNavbar}`}
                aria-label="教材進度"
            >
                <div className={styles.stepperBrand}>
                    <strong>{navigation.mainTitle}</strong>
                    <span>{secondaryTitle}</span>
                </div>
                <div className={styles.stepperTrack}>
                    {stepLabels.map((label, step) => {
                        const isActive = activeStep === step;
                        const isComplete = step < activeStep;
                        const isLocked = step > highestUnlockedStep;
                        return (
                            <button
                                key={`${step}-${label}`}
                                type="button"
                                className={`${styles.stepItem} ${isActive ? styles.stepActive : ""} ${isComplete ? styles.stepComplete : ""}`}
                                aria-current={isActive ? "page" : undefined}
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
        <nav className={styles.courseNavbar} aria-label="教材進度">
            <div className={styles.navbarContainer}>
                <div className={styles.brandSection}>
                    {navigation.mainTitle}
                </div>
                <div className={styles.contentSection}>
                    <div className={styles.mainNavLinks}>
                        {navigation.sectionTitles.map((title, index) => (
                            <span
                                key={title}
                                className={`${styles.navLink} ${activeTitles.includes(index) ? styles.navLinkActive : ""}`}
                            >
                                {title}
                            </span>
                        ))}
                    </div>
                    <div className={styles.horizontalLine} />
                    <div className={styles.subNavInfo}>
                        <div className={styles.currentSubtitle}>
                            {secondaryTitle}
                        </div>
                        <div className={styles.pageProgress}>
                            {stepLabels.map((_, step) => {
                                const isActive = activeStep === step;
                                const isLocked = step > highestUnlockedStep;
                                const pageNumber = String(step + 1).padStart(
                                    2,
                                    "0"
                                );
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
                                                ? `第 ${pageNumber} 頁尚未解鎖`
                                                : `前往第 ${pageNumber} 頁`
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
