import type {
    CourseStatus,
    ExperimentStatus,
    GradingMode,
    UserRole,
} from "./types";

export const roleLabels: Record<UserRole, string> = {
    STUDENT: "學生",
    EXPERIMENTER: "實驗者",
    ADMIN: "管理員",
};

export const experimentStatusLabels: Record<ExperimentStatus, string> = {
    DRAFT: "草稿",
    SCHEDULED: "已排程",
    ACTIVE: "進行中",
    COMPLETED: "已完成",
    ARCHIVED: "已封存",
};

export const gradingModeLabels: Record<GradingMode, string> = {
    AUTOMATIC: "自動評分",
    MANUAL: "人工評分",
};

export const courseStatusLabels: Record<CourseStatus, string> = {
    DRAFT: "草稿",
    PUBLISHED: "已發布",
    ARCHIVED: "已封存",
};

export function formatDateTime(value: string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

export function formatShortDateTime(value: string) {
    return new Intl.DateTimeFormat("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(value));
}
