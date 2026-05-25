import { useMemo } from "react";
import type {
    CoursePageRequest,
    QuestionPage,
    QuestionResponse,
} from "../types/types";
import { useQueries } from "@tanstack/react-query";
import { api } from "../../../../shared/utils/api";
import { Skeleton, Button, TextArea } from "@radix-ui/themes";
import styles from "./Questions.module.css";
import TextAreaStyle from "../components/UnstyledTextArea.module.css";
import FooterStyles from "../components/Footer.module.css";

type Props = {
    data: CoursePageRequest;
    onNext: () => void;
};

export default function Questions({ data, onNext }: Props) {
    const req = data.request as QuestionPage;

    const labelQueries = useQueries({
        queries: req.columns.map((col) => ({
            queryKey: ["content", "text", col.labelId],
            queryFn: () =>
                api<{ content: string }>(`/api/content/text/${col.labelId}`),
        })),
    });

    const allTitleIds = useMemo(
        () => req.columns.flatMap((col) => col.questions.map((q) => q.titleId)),
        [req.columns]
    );

    const titleQueries = useQueries({
        queries: allTitleIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });

    const titlesByColumn = useMemo(() => {
        const grouped: (typeof titleQueries)[number][][] = [];
        let cursor = 0;
        for (const col of req.columns) {
            grouped.push(
                titleQueries.slice(cursor, cursor + col.questions.length)
            );
            cursor += col.questions.length;
        }
        return grouped;
    }, [req.columns, titleQueries]);

    const allQuestionIds = useMemo(
        () =>
            req.columns.flatMap((col) =>
                col.questions.map((q) => q.questionId)
            ),
        [req.columns]
    );

    const questionQueries = useQueries({
        queries: allQuestionIds.map((id) => ({
            queryKey: ["question", id],
            queryFn: () => api<QuestionResponse>(`/api/questions/${id}`),
        })),
    });

    const questionById = useMemo(
        () => new Map(allQuestionIds.map((id, i) => [id, questionQueries[i]])),
        [allQuestionIds, questionQueries]
    );

    return (
        <div className={styles.pageContainer}>
            <main className={styles.contentWrapper}>
                {req.columns.map((column, colIndex) => {
                    const labelQuery = labelQueries[colIndex];
                    return (
                        <section key={colIndex} className={styles.column}>
                            <div className={styles.columnHeader}>
                                {labelQuery?.isError ? (
                                    <h2 className={styles.errorText}>
                                        載入失敗
                                    </h2>
                                ) : (
                                    <h2>{`${labelQuery?.data?.content ?? ""}：`}</h2>
                                )}
                            </div>
                            {column.questions.map((q, i) => {
                                const result = questionById.get(q.questionId);
                                const titleQuery =
                                    titlesByColumn[colIndex]?.[i];
                                const isLoading = result?.isLoading ?? true;
                                const isError = result?.isError ?? false;
                                const titleError = titleQuery?.isError ?? false;
                                return (
                                    <div
                                        key={i}
                                        className={styles.questionCard}
                                    >
                                        <div className={styles.titleRow}>
                                            <h3
                                                className={styles.questionTitle}
                                            >
                                                {titleQuery?.data?.content ??
                                                    ""}
                                            </h3>
                                            {(isError || titleError) && (
                                                <span
                                                    className={styles.errorText}
                                                >
                                                    載入失敗
                                                </span>
                                            )}
                                        </div>
                                        {isLoading ? (
                                            <Skeleton minHeight="0.875rem" />
                                        ) : isError ? null : (
                                            <p className={styles.questionText}>
                                                {result?.data?.content}
                                            </p>
                                        )}
                                        <TextArea
                                            className={TextAreaStyle.textInput}
                                            placeholder="在此輸入答案..."
                                            variant="soft"
                                            color="gray"
                                        />
                                    </div>
                                );
                            })}
                        </section>
                    );
                })}
            </main>

            <footer className={FooterStyles.footerContainer}>
                <div className={FooterStyles.footerActions}>
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出並前往下一頁
                    </Button>
                </div>
            </footer>
        </div>
    );
}
