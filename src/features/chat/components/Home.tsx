import Composer from "./Composer";
import styles from "./Home.module.css";

const SUGGESTIONS = [
    "光合作用是怎麼運作的？",
    "解釋牛頓第一運動定律",
    "月亮為什麼有圓缺？",
    "酸和鹼有什麼差別？",
];

type Props = {
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: (text: string) => void;
    busy?: boolean;
};

export default function Home({ draft, onDraftChange, onSend, busy }: Props) {
    return (
        <div className={styles.empty}>
            <div className={styles.inner}>
                <h1 className={styles.title}>您好，歡迎回來</h1>
                <div className={styles.composerSlot}>
                    <Composer
                        value={draft}
                        onChange={onDraftChange}
                        onSubmit={onSend}
                        disabled={busy}
                        autoFocus
                    />
                </div>
                <div className={styles.chips}>
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            className={styles.chip}
                            onClick={() => onSend(suggestion)}
                            disabled={busy}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
