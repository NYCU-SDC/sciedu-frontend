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
};

export default function Navbar({
    activeTitles,
    activeStep,
    highestUnlockedStep,
    secondaryTitle,
    onStepChange,
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
                            {[0, 1, 2].map((step) => {
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
                                        disabled={isLocked}
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
                                        onClick={() => onStepChange(step)}
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
