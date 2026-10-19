import { Maximize2, Minimize2 } from "lucide-react";
import styles from "./ExpandButton.module.css";

type Props = {
    label: string;
    onClick: () => void;
    expanded?: boolean;
    className?: string;
};

export default function ExpandButton({
    label,
    onClick,
    expanded,
    className = "",
}: Props) {
    return (
        <button
            type="button"
            className={`${styles.button} ${className}`}
            aria-label={label}
            aria-expanded={expanded}
            title={label}
            onClick={onClick}
        >
            {expanded ? (
                <Minimize2 aria-hidden="true" />
            ) : (
                <Maximize2 aria-hidden="true" />
            )}
        </button>
    );
}
