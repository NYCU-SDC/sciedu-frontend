import type { Experiment } from "../admin/types";
export type ExperienceMode = "standard" | "practice";
const MARKER = "<!-- sciedu-experience:v1:practice -->";
export function parseExperience(description = "") {
    const markerStart = description.indexOf("<!-- sciedu-experience");
    if (markerStart < 0)
        return { mode: "standard" as ExperienceMode, description, valid: true };
    const clean = description.slice(0, markerStart).trimEnd();
    return {
        mode: "practice" as ExperienceMode,
        description: clean,
        valid: description.slice(markerStart).trim() === MARKER,
    };
}
export function encodeExperience(
    description: string,
    mode: ExperienceMode = "standard"
) {
    if (description.includes("<!-- sciedu-experience"))
        throw new Error("實驗說明不能包含保留的模式標記");
    const value =
        description.trim() + (mode === "practice" ? "\n\n" + MARKER : "");
    if (value.length > 4000)
        throw new Error("實驗說明連同模式設定不可超過 4,000 字");
    return value;
}
export type DisplayStatus =
    | Experiment["status"]
    | "NOT_STARTED"
    | "ENDED"
    | "EXPIRED_SCHEDULE";
export const displayLabels: Record<DisplayStatus, string> = {
    DRAFT: "草稿",
    SCHEDULED: "已排程",
    ACTIVE: "進行中",
    COMPLETED: "已完成",
    ARCHIVED: "已封存",
    NOT_STARTED: "尚未開始",
    ENDED: "已結束",
    EXPIRED_SCHEDULE: "排程已結束",
};
export function displayStatus(
    e: Pick<Experiment, "status" | "scheduledStartAt" | "scheduledEndAt">,
    now: number
): DisplayStatus {
    if (e.status === "ACTIVE") {
        if (now >= Date.parse(e.scheduledEndAt)) return "ENDED";
        if (now < Date.parse(e.scheduledStartAt)) return "NOT_STARTED";
    }
    if (e.status === "SCHEDULED" && now >= Date.parse(e.scheduledEndAt))
        return "EXPIRED_SCHEDULE";
    return e.status;
}
export function isWithinSchedule(
    e: Pick<Experiment, "status" | "scheduledStartAt" | "scheduledEndAt">,
    now: number
) {
    return (
        e.status === "ACTIVE" &&
        now >= Date.parse(e.scheduledStartAt) &&
        now < Date.parse(e.scheduledEndAt)
    );
}
