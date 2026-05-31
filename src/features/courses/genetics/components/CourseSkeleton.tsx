import styles from "./CourseSkeleton.module.css";

type SkeletonBlockProps = {
    className?: string;
};

type SkeletonTextProps = {
    lines?: number;
    widths?: string[];
    className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
    return (
        <div
            aria-hidden="true"
            className={`${styles.skeletonBlock} ${className}`}
        />
    );
}

export function SkeletonText({
    lines = 3,
    widths = ["100%", "92%", "72%"],
    className = "",
}: SkeletonTextProps) {
    return (
        <div aria-hidden="true" className={`${styles.textStack} ${className}`}>
            {Array.from({ length: lines }, (_, index) => (
                <span
                    key={index}
                    className={styles.skeletonLine}
                    style={{ width: widths[index] ?? widths.at(-1) }}
                />
            ))}
        </div>
    );
}

export function SkeletonMedia({ className = "" }: SkeletonBlockProps) {
    return (
        <div
            aria-hidden="true"
            className={`${styles.mediaSkeleton} ${className}`}
        >
            <div className={styles.playButton} />
            <SkeletonText
                lines={2}
                widths={["42%", "64%"]}
                className={styles.mediaMeta}
            />
        </div>
    );
}

export function SkeletonQuizCard() {
    return (
        <div aria-hidden="true" className={styles.quizSkeleton}>
            <SkeletonText lines={1} widths={["58%"]} />
            <SkeletonText lines={3} widths={["100%", "94%", "68%"]} />
            <div className={styles.answerGrid}>
                <SkeletonBlock />
                <SkeletonBlock />
            </div>
        </div>
    );
}
