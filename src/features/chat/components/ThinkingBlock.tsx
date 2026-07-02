import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import styles from "./ThinkingBlock.module.css";

type Props = {
    thought: string;
    /** True while the `<think>` block is still streaming. */
    isThinking: boolean;
};

export default function ThinkingBlock({ thought, isThinking }: Props) {
    const hasThought = thought.trim().length > 0;
    const [open, setOpen] = useState(isThinking);
    const [prevThinking, setPrevThinking] = useState(isThinking);

    // Adjust the open state on the thinking→done transition during render (the
    // pattern React recommends over an effect): auto-open while thinking,
    // auto-collapse once it finishes.
    if (isThinking !== prevThinking) {
        setPrevThinking(isThinking);
        setOpen(isThinking);
    }

    const label = isThinking ? "正在思考" : "已完成思考";

    return (
        <div
            className={`${styles.thinking} ${isThinking ? styles.active : ""}`}
        >
            <button
                type="button"
                className={styles.head}
                onClick={() => hasThought && setOpen((value) => !value)}
                aria-expanded={hasThought ? open : undefined}
                disabled={!hasThought}
            >
                <span
                    className={`${styles.spark} ${isThinking ? styles.spin : ""}`}
                >
                    <Sparkles size={15} strokeWidth={1.6} />
                </span>
                <span className={styles.label}>{label}</span>
                {hasThought ? (
                    <span
                        className={`${styles.chevron} ${open ? styles.up : ""}`}
                    >
                        <ChevronDown size={15} strokeWidth={1.6} />
                    </span>
                ) : null}
            </button>
            {hasThought && open ? (
                <div className={styles.body}>
                    <p className={styles.reason}>{thought}</p>
                </div>
            ) : null}
        </div>
    );
}
