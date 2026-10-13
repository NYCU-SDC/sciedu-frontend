import { api } from "../../../../shared/utils/api";
import type { AnswerResultResponse } from "../types/types";

export function fetchAnswerResult(
    questionId: string,
    answerId: string
): Promise<AnswerResultResponse> {
    return api<AnswerResultResponse>(
        `/api/questions/${questionId}/answers/${answerId}/result`
    );
}
