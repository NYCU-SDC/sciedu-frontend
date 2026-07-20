import { ApiError, api } from "../../../../shared/utils/api";
import type {
    AnswerSubmissionRequest,
    QuestionResponse,
    SubmittedAnswerResponse,
} from "../types/types";

export async function submitAnswer(
    questionId: string,
    questionType: QuestionResponse["type"],
    answer: string
): Promise<SubmittedAnswerResponse | null> {
    const payload: AnswerSubmissionRequest =
        questionType === "CHOICE"
            ? { selectedOptionId: answer }
            : { textAnswer: answer.trim() };

    try {
        return await api<SubmittedAnswerResponse>(
            `/api/questions/${questionId}/answers`,
            {
                method: "POST",
                body: JSON.stringify(payload),
            }
        );
    } catch (error) {
        // A previous attempt may have submitted some questions before another
        // request failed. The API returns 409 when that answer already exists,
        // which still satisfies the page-completion requirement.
        if (error instanceof ApiError && error.status === 409) {
            return null;
        }

        throw error;
    }
}
