import type { QuestionsType } from "../types/types";
import { Button, TextArea } from "@radix-ui/themes";
import styles from "./Questions.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import SubmitButtonStyle from "../components/SubmitButton.module.css";

type Props = {
    data: QuestionsType;
    onNext: () => void;
};

export default function Questions({ data, onNext }: Props) {
    const content = data.content;
    return (
        <div className={styles.pageContainer}>
            <main className={styles.contentWrapper}>
                {content.columns.map((column, colIndex) => (
                    <section key={colIndex} className={styles.column}>
                        <div className={styles.columnHeader}>
                            <h2>{column.label}：</h2>
                        </div>

                        {column.questions.map((q, i) => (
                            <div key={i} className={styles.questionCard}>
                                <h3 className={styles.questionTitle}>
                                    問題 {colIndex + 1}-{i + 1}
                                </h3>
                                <p className={styles.questionText}>{q}</p>
                                <TextArea
                                    className={TextAreaStyle.textInput}
                                    placeholder="在此輸入答案..."
                                    variant="soft"
                                    color="gray"
                                />
                            </div>
                        ))}
                    </section>
                ))}
            </main>

            {/* button area */}
            <footer className={styles.footerContainer}>
                <div className={styles.footerActions}>
                    <Button
                        className={SubmitButtonStyle.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出 Send
                    </Button>
                    <Button
                        className={SubmitButtonStyle.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        下一頁
                    </Button>
                </div>
            </footer>
        </div>
    );
}
