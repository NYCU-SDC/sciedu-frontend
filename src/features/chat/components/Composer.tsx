import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import styles from "./Composer.module.css";

type Props = {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    /** True while a reply is streaming — the send button becomes a stop button. */
    busy?: boolean;
    onStop?: () => void;
    /** Disables sending without showing the stop affordance (e.g. while creating a chat). */
    disabled?: boolean;
    placeholder?: string;
    autoFocus?: boolean;
};

export default function Composer({
    value,
    onChange,
    onSubmit,
    busy = false,
    onStop,
    disabled = false,
    placeholder = "想問什麼問題？",
    autoFocus = false,
}: Props) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }, [value]);

    useEffect(() => {
        if (autoFocus) ref.current?.focus();
    }, [autoFocus]);

    const send = () => {
        const trimmed = value.trim();
        if (busy || disabled || !trimmed) return;
        onSubmit(trimmed);
    };

    return (
        <div className={styles.composer}>
            <textarea
                ref={ref}
                className={styles.input}
                rows={1}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                    }
                }}
            />
            <div className={styles.bar}>
                <div className={styles.left}>
                    <span className={styles.hint}>
                        由國中自然教科書輔助回答
                    </span>
                </div>
                {busy ? (
                    <button
                        type="button"
                        className={`${styles.send} ${styles.stop}`}
                        onClick={onStop}
                        title="停止"
                        aria-label="停止"
                    >
                        <span className={styles.stopGlyph} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className={styles.send}
                        onClick={send}
                        disabled={disabled || !value.trim()}
                        title="送出"
                        aria-label="送出"
                    >
                        <ArrowUp size={18} strokeWidth={2} />
                    </button>
                )}
            </div>
        </div>
    );
}
