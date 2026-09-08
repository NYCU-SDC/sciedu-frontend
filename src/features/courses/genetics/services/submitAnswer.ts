import { api } from "../../../../shared/utils/api";
import type {
    AnswerSubmissionRequest,
    QuestionResponse,
    SubmittedAnswerResponse,
} from "../types/types";

export async function submitAnswer(
    questionId: string,
    questionType: QuestionResponse["type"],
    answer: string
): Promise<SubmittedAnswerResponse> {
    const payload: AnswerSubmissionRequest =
        questionType === "CHOICE"
            ? { selectedOptionId: answer }
            : { textAnswer: answer.trim() };

    return api<SubmittedAnswerResponse>(
        `/api/questions/${questionId}/answers`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        }
    );
}
