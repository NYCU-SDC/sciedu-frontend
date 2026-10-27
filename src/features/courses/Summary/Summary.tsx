import { parseExperience } from "../../experience/experimentExperience";
import { Box, Button, Text, Title } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../../shared/auth";
import { useAttemptExperiment } from "../genetics/services/useAttemptExperiment";
import Header from "./components/Header";
import StatusBar from "./components/main/StatusBar";
import ResultCard from "./components/main/ResultCard";
import { loadCourseAttempt } from "../genetics/services/courseAttempt";
import { answerResultQueryOptions } from "../genetics/services/answerResultQueryOptions";
import { formatDuration, summarizeAnswerResults } from "./summaryResult";

export default function Summary() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { session } = useAuth();
    const current = useAttemptExperiment();
    const experimentId = current.data?.experiment.id ?? "";
    const mode = parseExperience(current.data?.experiment.description).mode;
    const navigationAttempt = (location.state as { attempt?: unknown } | null)
        ?.attempt;
    const courseId = searchParams.get("courseId") ?? null;
    const attempt = useMemo(
        () =>
            courseId && session?.email
                ? loadCourseAttempt(
                      courseId,
                      session.email,
                      experimentId,
                      navigationAttempt,
                      mode
                  )
                : null,
        [courseId, navigationAttempt, session, experimentId, mode]
    );
    const resultQueries = useQueries({
        queries: (attempt?.practice ? [] : (attempt?.submissions ?? [])).map(
            (submission) =>
                answerResultQueryOptions(
                    session?.email ?? "",
                    submission.questionId,
                    submission.id,
                    experimentId
                )
        ),
    });
    const results = resultQueries.flatMap((query) =>
        query.data ? [query.data] : []
    );
    const summary = summarizeAnswerResults(results);
    const isLoading = resultQueries.some((query) => query.isPending);
    const isRefreshing = resultQueries.some((query) => query.isFetching);
    const answeredQuestionCount = new Set(
        Object.values(attempt?.answersByPage ?? {}).flatMap((answers) =>
            Object.entries(answers)
                .filter(([, answer]) => answer.trim())
                .map(([id]) => id)
        )
    ).size;
    const unavailableCount = attempt?.practice
        ? 0
        : resultQueries.filter((query) => query.isError).length +
          Math.max(
              0,
              answeredQuestionCount - (attempt?.submissions.length ?? 0)
          );

    if (current.isPending)
        return (
            <Box p="xl" role="status">
                正在確認目前實驗…
            </Box>
        );
    if (current.isError)
        return (
            <Box p="xl">
                <Text role="alert">無法確認實驗，暫不顯示作答紀錄。</Text>
                <Button onClick={() => void current.refetch()}>重新載入</Button>
            </Box>
        );
    if (!attempt) {
        return (
            <Box
                mih="100vh"
                bg="#f0f6f4"
                p="48px 40px"
                style={{ display: "flex", flexDirection: "column" }}
            >
                <Header />
                <Box
                    component="main"
                    style={{
                        flex: 1,
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                    }}
                >
                    <div>
                        <Title order={2} c="brandTeal.8">
                            找不到本次作答紀錄
                        </Title>
                        <Text c="dimmed" mt="sm" mb="lg">
                            請先完成教材，再查看作答摘要。
                        </Text>
                        <Button onClick={() => navigate("/courses")}>
                            返回教材首頁
                        </Button>
                    </div>
                </Box>
            </Box>
        );
    }

    return (
        <Box
            mih="100vh"
            bg="#f0f6f4"
            p="48px 40px"
            style={{ display: "flex", flexDirection: "column" }}
        >
            <Header />
            <Box
                component="main"
                pt="16px"
                pb="16px"
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
                <StatusBar title={attempt.courseTitle} />
                <Box px="10px">
                    {attempt.practice && (
                        <Box bg="white" p="xl" style={{ borderRadius: 16 }}>
                            <Title order={2}>本輪練習已完成</Title>
                            <Text>
                                本機練習，不計正式成績。答案已保存在這個瀏覽器。
                            </Text>
                            <Text>
                                作答時間：
                                {formatDuration(
                                    attempt.startedAt,
                                    attempt.completedAt
                                )}
                            </Text>
                            <Button
                                mt="md"
                                onClick={() =>
                                    navigate(
                                        `/course/${encodeURIComponent(attempt.courseId)}`
                                    )
                                }
                            >
                                繼續練習
                            </Button>
                            <Button
                                mt="md"
                                variant="light"
                                onClick={() =>
                                    navigate(
                                        `/course/${encodeURIComponent(attempt.courseId)}`,
                                        { state: { confirmRestart: true } }
                                    )
                                }
                            >
                                重新練習
                            </Button>
                            <Button
                                mt="md"
                                variant="subtle"
                                onClick={() =>
                                    navigate(
                                        `/course/${encodeURIComponent(attempt.courseId)}?mode=review`,
                                        { state: { attempt } }
                                    )
                                }
                            >
                                查看本輪答案
                            </Button>
                        </Box>
                    )}
                    {!attempt.practice && (
                        <ResultCard
                            title="教材已完成！"
                            materialTitle={attempt.courseTitle}
                            description={
                                isLoading
                                    ? "正在取得正式評分結果…"
                                    : results.length === 0 &&
                                        unavailableCount === 0
                                      ? "本次作答沒有可顯示的評分結果"
                                      : "可返回教材查看每一題的作答與評分狀態"
                            }
                            correctCount={summary.correctCount}
                            wrongCount={summary.wrongCount}
                            pendingCount={summary.pendingCount}
                            hiddenCount={summary.hiddenCount}
                            failedCount={summary.failedCount}
                            unavailableCount={unavailableCount}
                            isLoading={isLoading}
                            isRefreshing={isRefreshing}
                            duration={formatDuration(
                                attempt.startedAt,
                                attempt.completedAt
                            )}
                            onDetailClick={() =>
                                navigate(
                                    `/course/${encodeURIComponent(attempt.courseId)}?mode=review`,
                                    { state: { attempt } }
                                )
                            }
                            onRetryResults={
                                resultQueries.length > 0
                                    ? () => {
                                          resultQueries.forEach((query) => {
                                              void query.refetch();
                                          });
                                      }
                                    : undefined
                            }
                        />
                    )}
                </Box>
            </Box>
        </Box>
    );
}
