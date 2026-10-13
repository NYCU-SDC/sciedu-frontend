export type ExperimentStatus =
    | "DRAFT"
    | "SCHEDULED"
    | "ACTIVE"
    | "COMPLETED"
    | "ARCHIVED";

export type CurrentExperiment = {
    id: string;
    name: string;
    description?: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    status: ExperimentStatus;
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

export type CurrentExperimentResponse = {
    experiment: CurrentExperiment;
    courses: Course[];
};

export type ExperimentCourseAssignment = {
    course: Course;
    linkedAt: string;
};

export type PaginatedResponse<T> = {
    items: T[];
    totalPages: number;
    totalItems: number;
    currentPage: number;
    pageSize: number;
    hasNextPage: boolean;
};
