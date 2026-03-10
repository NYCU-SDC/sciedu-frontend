import { Button, CheckboxGroup, TextArea } from "@radix-ui/themes";
import type { MaterialType } from "../types/types";
import styles from "./Material.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";

type Props = {
    data: MaterialType;
    onNext: () => void;
};

export default function Material({ data, onNext }: Props) {
    const content = data.content;

    return (
        <div className={styles.pageContainer}>
            <main className={styles.overviewContent}>
                {/* left section */}
                <section className={styles.courseSection}>
                    <div className={styles.imageContainer}>
                        <img src={content.image} alt="教材" />
                    </div>

                    <div className={styles.courseDescription}>
                        <p>{content.description}</p>
                    </div>
                </section>

                {/* right sidebar */}
                <aside className={styles.questionSidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>請根據左圖回答下列問題</h2>
                    </div>

                    {content.questions.map((ques) => (
                        <div className={styles.quizCard}>
                            <h3>{ques.title}</h3>
                            <p>{ques.description}</p>
                            {ques.type === "select" && (
                                <CheckboxGroup.Root
                                    className={styles.radioGroup}
                                >
                                    {ques.options.map((opt, j) => (
                                        <CheckboxGroup.Item
                                            value={`${j}`}
                                            key={j}
                                        >
                                            {opt}
                                        </CheckboxGroup.Item>
                                    ))}
                                </CheckboxGroup.Root>
                            )}
                            {ques.type === "text" && (
                                <TextArea
                                    className={TextAreaStyle.textInput}
                                    placeholder="在此輸入答案..."
                                    variant="soft"
                                    color="gray"
                                />
                            )}
                        </div>
                    ))}

                    <footer className={styles.sidebarFooter}>
                        <Button
                            className={styles.shadowButton}
                            variant="solid"
                            highContrast
                            onClick={onNext}
                            radius="full"
                        >
                            送出 Send
                        </Button>
                        <Button
                            className={styles.shadowButton}
                            variant="solid"
                            highContrast
                            onClick={onNext}
                            radius="full"
                        >
                            下一頁
                        </Button>
                    </footer>
                </aside>
            </main>
        </div>
    );
}
