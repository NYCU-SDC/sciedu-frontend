import { Box, Button, Text, Title } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../../shared/auth";
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
    const navigationAttempt = (location.state as { attempt?: unknown } | null)
        ?.attempt;
    const courseId = searchParams.get("courseId") ?? null;
    const attempt = useMemo(
        () =>
            courseId && session?.email
                ? loadCourseAttempt(courseId, session.email, navigationAttempt)
                : null,
        [courseId, navigationAttempt, session]
    );
    const resultQueries = useQueries({
        queries: (attempt?.submissions ?? []).map((submission) =>
            answerResultQueryOptions(
                session?.email ?? "",
                submission.questionId,
                submission.id
            )
        ),
    });
    const results = resultQueries.flatMap((query) =>
        query.data ? [query.data] : []
    );
    const summary = summarizeAnswerResults(results);
    const isLoading = resultQueries.some((query) => query.isFetching);
    const hasResultError = resultQueries.some((query) => query.isError);
    const answeredQuestionCount = new Set(
        Object.values(attempt?.answersByPage ?? {}).flatMap((answers) =>
            Object.keys(answers)
        )
    ).size;
    const unavailableCount =
        resultQueries.filter((query) => query.isError).length +
        Math.max(0, answeredQuestionCount - (attempt?.submissions.length ?? 0));

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
                    <ResultCard
                        title="教材已完成！"
                        materialTitle={attempt.courseTitle}
                        description={
                            isLoading
                                ? "正在取得正式評分結果…"
                                : results.length === 0 && unavailableCount === 0
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
                            hasResultError
                                ? () => {
                                      resultQueries.forEach((query) => {
                                          if (query.isError)
                                              void query.refetch();
                                      });
                                  }
                                : undefined
                        }
                    />
                </Box>
            </Box>
        </Box>
    );
}
