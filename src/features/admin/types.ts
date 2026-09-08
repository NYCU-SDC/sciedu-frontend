export type UserRole = "STUDENT" | "EXPERIMENTER" | "ADMIN";

export type User = {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    roles: UserRole[];
    createdAt: string;
    updatedAt: string;
};

export type ExperimentStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "ACTIVE"
    | "COMPLETED"
    | "ARCHIVED";

export type GradingMode = "AUTOMATIC" | "MANUAL";

export type CorrectAnswerReleaseMode =
    | "AFTER_PAGE_SUBMISSION"
    | "AFTER_COURSE_COMPLETION"
    | "NEVER";

export type ExperimentConfiguration = {
    maxAttempts: number;
    allowRetry: boolean;
    showScore: boolean;
    showExplanations: boolean;
    gradingMode: GradingMode;
    correctAnswerReleaseMode: CorrectAnswerReleaseMode;
};

export type Experiment = {
    id: string;
    name: string;
    description?: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    status: ExperimentStatus;
    configuration: ExperimentConfiguration;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};

export type ExperimentDetail = Experiment & {
    participantCount: number;
    courseCount: number;
};

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type Course = {
    id: string;
    code: string;
    title: string;
    description?: string;
    status: CourseStatus;
    createdAt: string;
    updatedAt: string;
};

export type ExperimentParticipantAssignment = {
    participant: User;
    assignedAt: string;
};

export type ExperimentCourseAssignment = {
    course: Course;
    linkedAt: string;
};

export type ParticipantCandidate = {
    user: User;
    isAssigned: boolean;
};

export type PaginatedResponse<T> = {
    items: T[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
};

export type ExperimentListParams = {
    page?: number;
    pageSize?: number;
    status?: ExperimentStatus;
    scheduledFrom?: string;
    scheduledTo?: string;
    search?: string;
};

export type UserListParams = {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: UserRole;
};
