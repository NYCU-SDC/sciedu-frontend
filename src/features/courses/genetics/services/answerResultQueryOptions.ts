import { queryOptions } from "@tanstack/react-query";
import { fetchAnswerResult } from "./fetchAnswerResult";

export function answerResultQueryOptions(
    userEmail: string,
    questionId: string,
    answerId: string,
    experimentId: string
) {
    return queryOptions({
        queryKey: [
            "answer-result",
            userEmail,
            experimentId,
            questionId,
            answerId,
        ],
        queryFn: () => fetchAnswerResult(questionId, answerId),
        enabled: Boolean(userEmail && experimentId),
        refetchInterval: (query) =>
            !query.state.error && query.state.data?.status === "PENDING"
                ? 2000
                : false,
        refetchIntervalInBackground: false,
    });
}
