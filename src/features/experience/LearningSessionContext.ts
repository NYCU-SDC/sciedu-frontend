import { createContext } from "react";
import type { SubmittedAnswerResponse } from "../courses/genetics/types/types";
export type SubmissionState = "pending" | "unknown";
export type LearningSession = {
    practice: boolean;
    submissions: SubmittedAnswerResponse[];
    operations: Record<string, SubmissionState>;
    beforeSubmit: (questionId: string) => void;
    rejected: (questionId: string, known: boolean) => void;
};
export const LearningSessionContext = createContext<
    LearningSession | undefined
>(undefined);
