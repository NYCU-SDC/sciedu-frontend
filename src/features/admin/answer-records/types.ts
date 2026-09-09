export type AnswerEvaluation = "CORRECT" | "INCORRECT" | "PENDING_REVIEW";
export type AnswerProgress = "COMPLETED" | "IN_PROGRESS";
export type PointerRegion = "material" | "media" | "question" | "chat";

export type QuestionAttempt = {
    id: string;
    pageIndex: number;
    pageTitle: string;
    questionTitle: string;
    questionContent: string;
    studentAnswer: string;
    correctAnswer: string;
    evaluation: AnswerEvaluation;
    submissionCount: number;
    lastSubmittedAt: string;
};

export type PointerSample = {
    elapsedMs: number;
    pageIndex: number;
    xRatio: number;
    yRatio: number;
    region: PointerRegion;
};

export type PointerSession = {
    pageIndex: number;
    viewportWidth: number;
    viewportHeight: number;
    durationMs: number;
    samples: PointerSample[];
};

export type AnswerAttempt = {
    id: string;
    experimentId: string;
    experimentName: string;
    courseId: string;
    courseTitle: string;
    coursePageCount: number;
    studentId: string;
    studentName: string;
    studentEmail: string;
    progress: AnswerProgress;
    courseAttemptNumber: number;
    startedAt: string;
    submittedAt?: string;
    durationMs: number;
    completedQuestionCount: number;
    totalQuestionCount: number;
    correctCount: number;
    incorrectCount: number;
    pendingReviewCount: number;
    questions: QuestionAttempt[];
    pointerSessions: PointerSession[];
};

export type AnswerAttemptFilters = {
    student?: string;
    experimentId?: string;
    courseId?: string;
    progress?: AnswerProgress;
    evaluation?: AnswerEvaluation;
};
