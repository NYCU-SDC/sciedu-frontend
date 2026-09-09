import { Badge, Button, Card, Tabs, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock3, MousePointer2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { useDocumentTitle } from "../../../shared/hooks";
import ExperimentAdminShell from "../components/ExperimentAdminShell";
import { fetchAnswerAttempt } from "../answer-records/answerRecordsRepository";
import PointerInteractionPanel from "../answer-records/PointerInteractionPanel";
import type {
    AnswerEvaluation,
    QuestionAttempt,
} from "../answer-records/types";
import { formatDateTime } from "../formatters";
import baseStyles from "./ExperimentAdmin.module.css";
import styles from "./AnswerRecords.module.css";

const evaluationPresentation: Record<
    AnswerEvaluation,
    { label: string; color: string }
> = {
    CORRECT: { label: "答對", color: "teal" },
    INCORRECT: { label: "答錯", color: "orange" },
    PENDING_REVIEW: { label: "待批改", color: "gray" },
};

function formatDuration(durationMs: number) {
    return `${Math.floor(durationMs / 60_000)} 分 ${String(
        Math.floor((durationMs % 60_000) / 1_000)
    ).padStart(2, "0")} 秒`;
}

export default function AnswerRecordDetailPage() {
    useDocumentTitle("作答紀錄詳細資料");
    const navigate = useNavigate();
    const { attemptId = "" } = useParams();
    const attemptQuery = useQuery({
        queryKey: ["admin", "answer-attempt", attemptId],
        queryFn: () => fetchAnswerAttempt(attemptId),
        enabled: Boolean(attemptId),
    });

    if (attemptQuery.isPending) {
        return <div className={baseStyles.pageStatus}>載入作答詳細資料中⋯</div>;
    }
    if (attemptQuery.isError || !attemptQuery.data) {
        return (
            <ExperimentAdminShell activeSection="answers">
                <div className={styles.notFound}>
                    <strong>找不到這筆作答紀錄</strong>
                    <Button onClick={() => navigate("/admin/answers")}>
                        返回列表
                    </Button>
                </div>
            </ExperimentAdminShell>
        );
    }

    const attempt = attemptQuery.data;
    const questionsByPage = attempt.questions.reduce<
        Record<number, QuestionAttempt[]>
    >((groups, question) => {
        groups[question.pageIndex] ??= [];
        groups[question.pageIndex].push(question);
        return groups;
    }, {});

    return (
        <ExperimentAdminShell activeSection="answers">
            <div className={baseStyles.contentStack}>
                <header className={baseStyles.pageHeader}>
                    <div className={baseStyles.titleGroup}>
                        <Button
                            className={baseStyles.backButton}
                            variant="subtle"
                            leftSection={
                                <ArrowLeft size={20} aria-hidden="true" />
                            }
                            onClick={() => navigate("/admin/answers")}
                        >
                            返回
                        </Button>
                        <Title order={1}>作答詳細資料</Title>
                    </div>
                    <Badge
                        size="lg"
                        color={
                            attempt.progress === "COMPLETED" ? "teal" : "cyan"
                        }
                        variant="light"
                    >
                        {attempt.progress === "COMPLETED" ? "已完成" : "作答中"}
                    </Badge>
                </header>

                <Card
                    className={`${baseStyles.card} ${styles.attemptSummary}`}
                    radius="lg"
                >
                    <div className={styles.identitySummary}>
                        <span>學生</span>
                        <strong>{attempt.studentName}</strong>
                        <small>{attempt.studentEmail}</small>
                    </div>
                    <div className={styles.summaryMetric}>
                        <span>教材／實驗</span>
                        <strong>{attempt.courseTitle}</strong>
                        <small>{attempt.experimentName}</small>
                    </div>
                    <div className={styles.summaryMetric}>
                        <span>作答區間</span>
                        <strong>{formatDateTime(attempt.startedAt)}</strong>
                        <small>
                            {attempt.submittedAt
                                ? `送出：${formatDateTime(attempt.submittedAt)}`
                                : "尚未完成送出"}
                        </small>
                    </div>
                    <div className={styles.summaryMetric}>
                        <span>教材作答</span>
                        <strong>第 {attempt.courseAttemptNumber} 次</strong>
                        <small>{formatDuration(attempt.durationMs)}</small>
                    </div>
                    <div className={styles.summaryMetric}>
                        <span>結果</span>
                        <strong>
                            {attempt.correctCount} 對・{attempt.incorrectCount}{" "}
                            錯
                        </strong>
                        <small>待批改 {attempt.pendingReviewCount} 題</small>
                    </div>
                </Card>

                <Tabs defaultValue="answers" className={styles.detailTabs}>
                    <Tabs.List>
                        <Tabs.Tab
                            value="answers"
                            leftSection={
                                <CheckCircle2 size={18} aria-hidden="true" />
                            }
                        >
                            作答明細
                        </Tabs.Tab>
                        <Tabs.Tab
                            value="pointer"
                            leftSection={
                                <MousePointer2 size={18} aria-hidden="true" />
                            }
                        >
                            滑鼠互動
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="answers" className={styles.tabPanel}>
                        {Object.entries(questionsByPage).map(
                            ([page, questions]) => (
                                <section
                                    key={page}
                                    className={styles.pageAnswers}
                                >
                                    <div className={styles.pageHeading}>
                                        <span className={styles.pageNumber}>
                                            {String(page).padStart(2, "0")}
                                        </span>
                                        <div>
                                            <strong>
                                                {questions?.[0]?.pageTitle}
                                            </strong>
                                            <small>
                                                {questions?.length ?? 0} 題作答
                                            </small>
                                        </div>
                                    </div>
                                    <div className={styles.questionGrid}>
                                        {questions?.map((question) => {
                                            const presentation =
                                                evaluationPresentation[
                                                    question.evaluation
                                                ];
                                            return (
                                                <Card
                                                    key={question.id}
                                                    className={
                                                        styles.questionCard
                                                    }
                                                    radius="md"
                                                >
                                                    <div
                                                        className={
                                                            styles.questionHeader
                                                        }
                                                    >
                                                        <div>
                                                            <strong>
                                                                {
                                                                    question.questionTitle
                                                                }
                                                            </strong>
                                                            <p>
                                                                {
                                                                    question.questionContent
                                                                }
                                                            </p>
                                                        </div>
                                                        <Badge
                                                            color={
                                                                presentation.color
                                                            }
                                                            variant="light"
                                                        >
                                                            {presentation.label}
                                                        </Badge>
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.answerColumns
                                                        }
                                                    >
                                                        <div>
                                                            <span>
                                                                學生答案
                                                            </span>
                                                            <p>
                                                                {
                                                                    question.studentAnswer
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <span>
                                                                {question.evaluation ===
                                                                "PENDING_REVIEW"
                                                                    ? "評分參考"
                                                                    : "正確答案"}
                                                            </span>
                                                            <p>
                                                                {
                                                                    question.correctAnswer
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div
                                                        className={
                                                            styles.questionMeta
                                                        }
                                                    >
                                                        <span>
                                                            <Clock3
                                                                size={14}
                                                                aria-hidden="true"
                                                            />
                                                            最後送出：
                                                            {formatDateTime(
                                                                question.lastSubmittedAt
                                                            )}
                                                        </span>
                                                        <strong>
                                                            提交／修改{" "}
                                                            {
                                                                question.submissionCount
                                                            }{" "}
                                                            次
                                                        </strong>
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </section>
                            )
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="pointer" className={styles.tabPanel}>
                        <PointerInteractionPanel attempt={attempt} />
                    </Tabs.Panel>
                </Tabs>
            </div>
        </ExperimentAdminShell>
    );
}
