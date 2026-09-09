import { useState } from "react";
import {
    Badge,
    Button,
    Card,
    Select,
    Table,
    TextInput,
    Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useNavigate } from "react-router";

import { useDocumentTitle } from "../../../shared/hooks";
import { demoCourses, demoExperiment } from "../data/demoAdminData";
import ExperimentAdminShell from "../components/ExperimentAdminShell";
import { formatShortDateTime } from "../formatters";
import { listAnswerAttempts } from "../answer-records/answerRecordsRepository";
import type { AnswerEvaluation, AnswerProgress } from "../answer-records/types";
import baseStyles from "./ExperimentAdmin.module.css";
import styles from "./AnswerRecords.module.css";

const progressLabels: Record<AnswerProgress, string> = {
    COMPLETED: "已完成",
    IN_PROGRESS: "作答中",
};

const evaluationOptions = [
    { value: "CORRECT", label: "包含答對" },
    { value: "INCORRECT", label: "包含答錯" },
    { value: "PENDING_REVIEW", label: "包含待批改" },
];

function formatDuration(durationMs: number) {
    const minutes = Math.floor(durationMs / 60_000);
    const seconds = Math.floor((durationMs % 60_000) / 1_000);
    return `${minutes} 分 ${String(seconds).padStart(2, "0")} 秒`;
}

export default function AnswerRecordsPage() {
    useDocumentTitle("作答紀錄");
    const navigate = useNavigate();
    const [student, setStudent] = useState("");
    const [experimentId, setExperimentId] = useState<string | null>(null);
    const [courseId, setCourseId] = useState<string | null>(null);
    const [progress, setProgress] = useState<AnswerProgress | null>(null);
    const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
    const attemptsQuery = useQuery({
        queryKey: [
            "admin",
            "answer-attempts",
            student,
            experimentId,
            courseId,
            progress,
            evaluation,
        ],
        queryFn: () =>
            listAnswerAttempts({
                student,
                experimentId: experimentId ?? undefined,
                courseId: courseId ?? undefined,
                progress: progress ?? undefined,
                evaluation: evaluation ?? undefined,
            }),
    });
    const attempts = attemptsQuery.data ?? [];

    return (
        <ExperimentAdminShell activeSection="answers">
            <div className={baseStyles.contentStack}>
                <header className={baseStyles.pageHeader}>
                    <Title order={1}>作答紀錄</Title>
                </header>
                <section className={baseStyles.listIntro}>
                    <div>
                        <Title order={2}>學生教材作答</Title>
                        <p className={baseStyles.muted}>
                            查看學生的作答結果、提交次數與教材互動歷程。
                        </p>
                    </div>
                    <Badge variant="light" color="teal" size="lg">
                        Demo 資料
                    </Badge>
                </section>

                <Card
                    className={`${baseStyles.card} ${styles.filters}`}
                    radius="lg"
                >
                    <TextInput
                        type="search"
                        aria-label="搜尋學生"
                        placeholder="搜尋學生姓名或 Email"
                        value={student}
                        onChange={(event) =>
                            setStudent(event.currentTarget.value)
                        }
                        leftSection={<Search size={16} aria-hidden="true" />}
                    />
                    <Select
                        aria-label="篩選教材"
                        placeholder="全部教材"
                        clearable
                        value={courseId}
                        onChange={setCourseId}
                        data={demoCourses.map(({ course }) => ({
                            value: course.id,
                            label: course.title,
                        }))}
                    />
                    <Select
                        aria-label="篩選實驗"
                        placeholder="全部實驗"
                        clearable
                        value={experimentId}
                        onChange={setExperimentId}
                        data={[
                            {
                                value: demoExperiment.id,
                                label: demoExperiment.name,
                            },
                        ]}
                    />
                    <Select
                        aria-label="篩選完成狀態"
                        placeholder="全部完成狀態"
                        clearable
                        value={progress}
                        onChange={(value) =>
                            setProgress(value as AnswerProgress | null)
                        }
                        data={Object.entries(progressLabels).map(
                            ([value, label]) => ({
                                value,
                                label,
                            })
                        )}
                    />
                    <Select
                        aria-label="篩選評定狀態"
                        placeholder="全部評定狀態"
                        clearable
                        value={evaluation}
                        onChange={(value) =>
                            setEvaluation(value as AnswerEvaluation | null)
                        }
                        data={evaluationOptions}
                    />
                    <Button
                        variant="subtle"
                        onClick={() => {
                            setStudent("");
                            setExperimentId(null);
                            setCourseId(null);
                            setProgress(null);
                            setEvaluation(null);
                        }}
                    >
                        清除篩選
                    </Button>
                </Card>

                <Card
                    className={`${baseStyles.card} ${baseStyles.tableCard}`}
                    radius="lg"
                >
                    <div className={baseStyles.tableTop}>
                        <strong>共 {attempts.length} 筆作答紀錄</strong>
                        <span className={baseStyles.muted}>
                            依最後作答時間排序
                        </span>
                    </div>
                    {attemptsQuery.isPending ? (
                        <p className={baseStyles.empty}>載入作答紀錄中⋯</p>
                    ) : attemptsQuery.isError ? (
                        <p className={baseStyles.empty}>作答紀錄載入失敗</p>
                    ) : attempts.length === 0 ? (
                        <p className={baseStyles.empty}>
                            找不到符合條件的作答紀錄
                        </p>
                    ) : (
                        <div className={baseStyles.tableScroll}>
                            <Table
                                className={styles.table}
                                horizontalSpacing="lg"
                                verticalSpacing="md"
                            >
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>學生</Table.Th>
                                        <Table.Th>教材</Table.Th>
                                        <Table.Th>進度</Table.Th>
                                        <Table.Th>評定結果</Table.Th>
                                        <Table.Th>教材作答</Table.Th>
                                        <Table.Th>作答區間</Table.Th>
                                        <Table.Th>作答時長</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {attempts.map((attempt) => (
                                        <Table.Tr
                                            key={attempt.id}
                                            className={baseStyles.clickableRow}
                                            tabIndex={0}
                                            onClick={() =>
                                                navigate(
                                                    `/admin/answers/${attempt.id}`
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    navigate(
                                                        `/admin/answers/${attempt.id}`
                                                    );
                                                }
                                            }}
                                        >
                                            <Table.Td>
                                                <strong
                                                    className={
                                                        styles.studentName
                                                    }
                                                >
                                                    {attempt.studentName}
                                                </strong>
                                                <small
                                                    className={
                                                        styles.studentEmail
                                                    }
                                                >
                                                    {attempt.studentEmail}
                                                </small>
                                            </Table.Td>
                                            <Table.Td>
                                                <strong>
                                                    {attempt.courseTitle}
                                                </strong>
                                                <small
                                                    className={
                                                        styles.studentEmail
                                                    }
                                                >
                                                    {attempt.experimentName}
                                                </small>
                                            </Table.Td>
                                            <Table.Td>
                                                <Badge
                                                    color={
                                                        attempt.progress ===
                                                        "COMPLETED"
                                                            ? "teal"
                                                            : "cyan"
                                                    }
                                                    variant="light"
                                                >
                                                    {
                                                        progressLabels[
                                                            attempt.progress
                                                        ]
                                                    }
                                                    ・
                                                    {
                                                        attempt.completedQuestionCount
                                                    }
                                                    /
                                                    {attempt.totalQuestionCount}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td>
                                                <div
                                                    className={
                                                        styles.resultBadges
                                                    }
                                                >
                                                    <Badge
                                                        color="teal"
                                                        variant="light"
                                                    >
                                                        答對{" "}
                                                        {attempt.correctCount}
                                                    </Badge>
                                                    <Badge
                                                        color="orange"
                                                        variant="light"
                                                    >
                                                        答錯{" "}
                                                        {attempt.incorrectCount}
                                                    </Badge>
                                                    {attempt.pendingReviewCount >
                                                        0 && (
                                                        <Badge
                                                            color="gray"
                                                            variant="light"
                                                        >
                                                            待批改{" "}
                                                            {
                                                                attempt.pendingReviewCount
                                                            }
                                                        </Badge>
                                                    )}
                                                </div>
                                            </Table.Td>
                                            <Table.Td>
                                                第 {attempt.courseAttemptNumber}{" "}
                                                次
                                            </Table.Td>
                                            <Table.Td>
                                                {formatShortDateTime(
                                                    attempt.startedAt
                                                )}
                                                <span
                                                    className={styles.timeArrow}
                                                >
                                                    {" "}
                                                    →{" "}
                                                </span>
                                                {attempt.submittedAt
                                                    ? formatShortDateTime(
                                                          attempt.submittedAt
                                                      )
                                                    : "尚未完成"}
                                            </Table.Td>
                                            <Table.Td>
                                                {formatDuration(
                                                    attempt.durationMs
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </div>
                    )}
                </Card>
            </div>
        </ExperimentAdminShell>
    );
}
