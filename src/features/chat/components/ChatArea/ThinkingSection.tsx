import { useState } from "react";
import { Brain } from "lucide-react";
import styles from "./ThinkingSection.module.css";

type ThinkingSectionProps = {
    thought: string;
    isThinking: boolean;
};

export default function ThinkingSection({
    thought,
    isThinking,
}: ThinkingSectionProps) {
    const [isExpanded, setIsExpanded] = useState(isThinking);
    const hasThought = thought.trim().length > 0;

    return (
        <section className={styles.thinkingSection}>
            <button
                type="button"
                className={styles.thinkingHeader}
                onClick={() => {
                    if (hasThought) {
                        setIsExpanded((value) => !value);
                    }
                }}
                aria-expanded={hasThought ? isExpanded : undefined}
                disabled={!hasThought}
            >
                <Brain className={styles.thinkingIcon} />
                <span className={styles.thinkingLabel}>
                    {isThinking ? "正在思考" : "思考了一陣子"}
                </span>
                {isThinking ? (
                    <span className={styles.thinkingDots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </span>
                ) : null}
            </button>

            {hasThought && isExpanded ? (
                <div className={styles.thinkingBody}>{thought}</div>
            ) : null}
        </section>
    );
}
