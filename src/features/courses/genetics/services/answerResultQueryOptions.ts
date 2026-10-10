import { queryOptions } from "@tanstack/react-query";
import { fetchAnswerResult } from "./fetchAnswerResult";

export function answerResultQueryOptions(
    userEmail: string,
    questionId: string,
    answerId: string
) {
    return queryOptions({
        queryKey: ["answer-result", userEmail, questionId, answerId],
        queryFn: () => fetchAnswerResult(questionId, answerId),
        enabled: Boolean(userEmail),
        refetchInterval: (query) =>
            !query.state.error && query.state.data?.status === "PENDING"
                ? 2000
                : false,
        refetchIntervalInBackground: false,
    });
}
