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
        const record = JSON.parse(sessionStorage.getItem(key) ?? "null");
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
            sessionStorage.setItem(key, JSON.stringify({ revision, state }));
        } catch {
            /* In-memory flow remains usable. */
        }
}
export function clearPlayerSessions() {
    try {
        for (const key of Object.keys(sessionStorage))
            if (key.startsWith(PLAYER_SESSION_PREFIX))
                sessionStorage.removeItem(key);
    } catch {
        /* unavailable */
    }
}
