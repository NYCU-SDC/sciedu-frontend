import styles from "./Skeleton.module.css";

type SkeletonProps = {
    width?: string;
    height?: string;
    radius?: string;
    className?: string;
};

export function Skeleton({
    width,
    height,
    radius,
    className = "",
}: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={`${styles.skeleton} ${className}`}
            style={{ width, height, borderRadius: radius }}
        />
    );
}
