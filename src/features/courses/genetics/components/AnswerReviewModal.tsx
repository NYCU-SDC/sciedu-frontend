import { Modal } from "@mantine/core";
import type { CourseQuestionReview } from "../types/types";
import styles from "./AnswerReviewModal.module.css";

type Props = {
    opened: boolean;
    title: string;
    question: string;
    review: CourseQuestionReview;
    onClose: () => void;
};

export default function AnswerReviewModal({
    opened,
    title,
    question,
    review,
    onClose,
}: Props) {
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
            classNames={{
                content: styles.content,
                header: styles.header,
                body: styles.body,
            }}
        >
            <div className={styles.scrollArea} tabIndex={0}>
                <section>
                    <h3>{title}</h3>
                    <p>{question}</p>
                </section>
                <section>
                    <h3>你的答案</h3>
                    <p>{review.studentAnswer}</p>
                </section>
                <section>
                    <h3>正確答案</h3>
                    <p>{review.correctAnswer}</p>
                </section>
                <section>
                    <h3>完整詳解</h3>
                    <p>{review.explanation}</p>
                </section>
            </div>
        </Modal>
    );
}
