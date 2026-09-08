import { useState } from "react";
import { Button, Modal, Textarea } from "@mantine/core";
import { Send } from "lucide-react";
import type { DemoQuestionReview } from "../../demo/demoCourseCatalog";
import styles from "./AnswerReviewModal.module.css";

type Props = {
    opened: boolean;
    title: string;
    question: string;
    review: DemoQuestionReview;
    onClose: () => void;
    onAsk: (question: string) => void;
};

export default function AnswerReviewModal({
    opened,
    title,
    question,
    review,
    onClose,
    onAsk,
}: Props) {
    const [draft, setDraft] = useState("");
    const submit = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        onAsk(trimmed);
        setDraft("");
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="詳解"
            centered
            size="xl"
            radius="lg"
            trapFocus
            returnFocus
            closeOnEscape
            closeOnClickOutside
            overlayProps={{ backgroundOpacity: 0.48, blur: 2 }}
            classNames={{ content: styles.content, body: styles.body }}
        >
            <div className={styles.scrollArea} tabIndex={0}>
                <section className={styles.section}>
                    <h3>{title}</h3>
                    <p>{question}</p>
                </section>
                <section className={styles.section}>
                    <h3>你的答案</h3>
                    <p className={styles.answer}>{review.studentAnswer}</p>
                </section>
                <section className={styles.section}>
                    <h3>正確答案</h3>
                    <p className={styles.answer}>{review.correctAnswer}</p>
                </section>
                <section className={styles.section}>
                    <h3>完整詳解</h3>
                    <p>{review.explanation}</p>
                </section>
            </div>
            <footer className={styles.footer}>
                <Textarea
                    className={styles.input}
                    label="針對這題詢問 LLM"
                    placeholder="輸入你的問題…"
                    autosize
                    minRows={2}
                    maxRows={4}
                    value={draft}
                    onChange={(event) => setDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            submit();
                        }
                    }}
                />
                <Button
                    onClick={submit}
                    disabled={!draft.trim()}
                    rightSection={<Send size={17} aria-hidden="true" />}
                >
                    送出
                </Button>
            </footer>
        </Modal>
    );
}
