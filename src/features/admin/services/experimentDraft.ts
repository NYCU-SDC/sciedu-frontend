import type { EditableExperimentPayload, ExperimentDetail } from "../types";

export type ExperimentDraft = {
    name: string;
    description: string;
    startsAt: string;
    endsAt: string;
    maxAttempts: string;
    result: "hidden" | "score" | "explanations";
    release: "page" | "course" | "never";
    courseIds: string[];
};

export function toTaipeiInputValue(value: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(value));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function timestamp(value: string, original?: string) {
    return original && toTaipeiInputValue(original) === value
        ? original
        : new Date(`${value}:00+08:00`).toISOString();
}

export function buildExperimentPayload(
    draft: ExperimentDraft,
    original?: ExperimentDetail
): EditableExperimentPayload {
    const configuration = original?.configuration;
    const originalResult = configuration?.showExplanations
        ? "explanations"
        : configuration?.showScore
          ? "score"
          : "hidden";
    const sameResult = configuration && draft.result === originalResult;
    const sameAttempts =
        configuration &&
        draft.maxAttempts === String(Math.max(1, configuration.maxAttempts));
    // ACTIVE experiments only permit extending the end time. Preserve every
    // locked field exactly, including timestamps rounded by datetime-local.
    if (original?.status === "ACTIVE") {
        return {
            name: original.name,
            description: original.description,
            scheduledStartAt: original.scheduledStartAt,
            scheduledEndAt: timestamp(draft.endsAt, original.scheduledEndAt),
            configuration: { ...original.configuration },
        };
    }
    return {
        name: draft.name === original?.name ? original.name : draft.name.trim(),
        description:
            draft.description === (original?.description ?? "")
                ? original?.description
                : draft.description.trim(),
        scheduledStartAt: timestamp(draft.startsAt, original?.scheduledStartAt),
        scheduledEndAt: timestamp(draft.endsAt, original?.scheduledEndAt),
        configuration: {
            ...configuration,
            maxAttempts: sameAttempts
                ? configuration.maxAttempts
                : Number(draft.maxAttempts),
            allowRetry: sameAttempts
                ? configuration.allowRetry
                : Number(draft.maxAttempts) > 1,
            showScore: sameResult
                ? configuration.showScore
                : draft.result !== "hidden",
            showExplanations: sameResult
                ? configuration.showExplanations
                : draft.result === "explanations",
            gradingMode: configuration?.gradingMode ?? "AUTOMATIC",
            correctAnswerReleaseMode:
                draft.release === "page"
                    ? "AFTER_PAGE_SUBMISSION"
                    : draft.release === "never"
                      ? "NEVER"
                      : "AFTER_COURSE_COMPLETION",
        },
    };
}
