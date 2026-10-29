import {
    readPersistent,
    writePersistent,
    clearPersistent,
} from "../../experience/persistentStorage";
import {
    validCCMStates,
    type CCMSimulationStates,
    isSimulationState,
    type SimulationState,
} from "./presentation";
import type {
    CourseAnswers,
    SubmittedAnswerResponse,
} from "../genetics/types/types";
export const PLAYER_SESSION_PREFIX = "sciedu-course-player:v1:";
export type PlayerSession = {
    operations?: Record<string, "pending" | "unknown">;
    currentIndex: number;
    highestUnlockedIndex: number;
    completed: number[];
    answersByPage: Record<number, CourseAnswers>;
    submissions: SubmittedAnswerResponse[];
    startedAt: string;
    simulationState?: SimulationState;
    ccmSimulationStates?: CCMSimulationStates;
    dismissedNotices?: string[];
};
// Local navigation/answer recovery only. Never used as server progress or access permission.
export function readPlayerSession(
    key: string | null,
    revision: string,
    pageCount: number
): PlayerSession | undefined {
    if (!key) return;
    try {
        const record = JSON.parse(readPersistent(key) ?? "null");
        const s = record?.state;
        const index = (i: unknown) =>
            typeof i === "number" &&
            Number.isInteger(i) &&
            i >= 0 &&
            i < pageCount;
        if (
            record?.revision !== revision ||
            !s ||
            !index(s.currentIndex) ||
            !index(s.highestUnlockedIndex) ||
            s.currentIndex > s.highestUnlockedIndex ||
            !Array.isArray(s.completed) ||
            !s.completed.every(index) ||
            typeof s.answersByPage !== "object" ||
            !s.answersByPage ||
            !Array.isArray(s.submissions) ||
            !s.submissions.every(
                (a: SubmittedAnswerResponse) =>
                    typeof a.id === "string" && typeof a.questionId === "string"
            ) ||
            (s.operations !== undefined &&
                (!s.operations ||
                    typeof s.operations !== "object" ||
                    Array.isArray(s.operations) ||
                    !Object.values(s.operations).every(
                        (v) => v === "pending" || v === "unknown"
                    ))) ||
            (s.simulationState !== undefined &&
                !isSimulationState(s.simulationState)) ||
            (s.ccmSimulationStates !== undefined &&
                !validCCMStates(s.ccmSimulationStates)) ||
            (s.dismissedNotices !== undefined &&
                (!Array.isArray(s.dismissedNotices) ||
                    !s.dismissedNotices.every(
                        (x: unknown) => typeof x === "string"
                    ))) ||
            typeof s.startedAt !== "string"
        )
            return;
        return s;
    } catch {
        return;
    }
}
export function writePlayerSession(
    key: string | null,
    revision: string,
    state: PlayerSession
) {
    if (key)
        try {
            writePersistent(key, JSON.stringify({ revision, state }));
        } catch {
            throw new Error(
                "無法保存進度，請確認瀏覽器儲存空間後重試；請勿關閉頁面。"
            );
        }
}
export function clearPlayerSessions() {
    try {
        clearPersistent(PLAYER_SESSION_PREFIX);
    } catch {
        /* unavailable */
    }
}
