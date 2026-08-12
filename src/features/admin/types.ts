export type UserRole = "STUDENT" | "EXPERIMENTER" | "ADMIN";

export type ExperimentStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

export type PaginatedResponse<T> = {
    items: T[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
};

export type AdminExperiment = {
    id: string;
    name: string;
    description: string;
    status: ExperimentStatus;
    startAt: string;
    endAt: string;
    location: string;
    mode: string;
};

export type ExperimentSummary = {
    participantCount: number;
    materialCount: number;
    remainingSeconds: number;
};

export type ParticipantProgress = {
    userId: string;
    name: string;
    email: string;
    role: UserRole;
    completedMaterials: number;
    totalMaterials: number;
    startedAt: string | null;
};

export type MaterialProgress = {
    materialId: string;
    code: string;
    name: string;
    description: string;
    completedStudents: number;
    totalStudents: number;
};

export type ParticipantAvailability = "AVAILABLE" | "CONFLICT";

export type ParticipantCandidate = {
    userId: string;
    name: string;
    email: string;
    availability: ParticipantAvailability;
    conflictReason?: string;
};

export type AdminOverview = {
    experiment: AdminExperiment;
    summary: ExperimentSummary;
};

export type ParticipantListParams = {
    page: number;
    pageSize: number;
    q: string;
    role?: UserRole;
};

export type MaterialListParams = {
    q: string;
    order: "asc" | "desc";
};
