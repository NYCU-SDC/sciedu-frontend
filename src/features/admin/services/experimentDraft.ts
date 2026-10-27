import {
    parseExperience,
    encodeExperience,
    type ExperienceMode,
} from "../../experience/experimentExperience";
import type { EditableExperimentPayload, ExperimentDetail } from "../types";

export type ExperimentDraft = {
    mode?: ExperienceMode;
    name: string;
    description: string;
    startsAt: string;
    endsAt: string;
    maxAttempts: string;
    allowRetry: boolean;
    showScore: boolean;
    showExplanations: boolean;
    release: "page" | "course" | "never";
    courseIds: string[];
};

export const releaseLabels = {
    never: "不公開正確答案",
    page: "正確答案於各頁必要作答提交成功後公開",
    course: "正確答案於整份教材必要作答全部完成後公開",
} as const;

export function retryLabel(
    draft: Pick<ExperimentDraft, "allowRetry" | "maxAttempts">
) {
    return draft.allowRetry
        ? `可重新作答 ${Math.max(0, Number(draft.maxAttempts) - 1)} 次（共 ${draft.maxAttempts} 次）`
        : Number(draft.maxAttempts) === 1
          ? "不允許重新作答（共 1 次）"
          : `不允許重新作答（保留次數上限 ${draft.maxAttempts} 次）`;
}

export function feedbackSummary(draft: ExperimentDraft) {
    if (draft.mode === "practice")
        return "有效實驗時段內不限次數；答案僅存本機，不計正式成績，AI 使用真實服務。";
    return `${draft.showScore ? "學生可查看分數與答對答錯" : "學生不可查看分數與答對答錯"}，${draft.showExplanations ? "顯示評分說明" : "不顯示評分說明"}；${releaseLabels[draft.release]}。${retryLabel(draft)}。${draft.allowRetry && draft.release !== "never" ? "正確答案公開後仍可在次數上限內重新作答。" : ""}`;
}

export function experimentToDraft(
    original: ExperimentDetail,
    courseIds: string[] = []
): ExperimentDraft {
    return {
        name: original.name,
        description: parseExperience(original.description).description,
        mode: parseExperience(original.description).mode,
        startsAt: toTaipeiInputValue(original.scheduledStartAt),
        endsAt: toTaipeiInputValue(original.scheduledEndAt),
        maxAttempts: String(original.configuration.maxAttempts),
        allowRetry: original.configuration.allowRetry,
        showScore: original.configuration.showScore,
        showExplanations: original.configuration.showExplanations,
        release:
            original.configuration.correctAnswerReleaseMode === "NEVER"
                ? "never"
                : original.configuration.correctAnswerReleaseMode ===
                    "AFTER_PAGE_SUBMISSION"
                  ? "page"
                  : "course",
        courseIds,
    };
}

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
    const originalMode = parseExperience(original?.description);
    return {
        name: draft.name === original?.name ? original.name : draft.name.trim(),
        description:
            original &&
            originalMode.valid &&
            draft.description === originalMode.description &&
            (draft.mode ?? "standard") === originalMode.mode
                ? original.description
                : encodeExperience(draft.description, draft.mode),
        scheduledStartAt: timestamp(draft.startsAt, original?.scheduledStartAt),
        scheduledEndAt: timestamp(draft.endsAt, original?.scheduledEndAt),
        configuration: {
            ...configuration,
            maxAttempts: Number(draft.maxAttempts),
            allowRetry: draft.allowRetry,
            showScore: draft.showScore,
            showExplanations: draft.showExplanations,
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
