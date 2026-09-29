import type { AnswerResultResponse } from "../genetics/types/types";

export type AnswerSummary = {
    correctCount: number;
    wrongCount: number;
    pendingCount: number;
    hiddenCount: number;
    failedCount: number;
};

export function summarizeAnswerResults(
    results: AnswerResultResponse[]
): AnswerSummary {
    return results.reduce<AnswerSummary>(
        (summary, result) => {
            if (result.status === "FAILED") {
                summary.failedCount += 1;
            } else if (result.status === "PENDING") {
                summary.pendingCount += 1;
            } else if (!result.resultVisible) {
                summary.hiddenCount += 1;
            } else if (result.isCorrect === true) {
                summary.correctCount += 1;
            } else if (result.isCorrect === false) {
                summary.wrongCount += 1;
            } else {
                summary.pendingCount += 1;
            }
            return summary;
        },
        {
            correctCount: 0,
            wrongCount: 0,
            pendingCount: 0,
            hiddenCount: 0,
            failedCount: 0,
        }
    );
}

export function formatDuration(startedAt: string, completedAt: string) {
    const elapsedSeconds = Math.max(
        0,
        Math.round(
            (new Date(completedAt).getTime() - new Date(startedAt).getTime()) /
                1000
        )
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
