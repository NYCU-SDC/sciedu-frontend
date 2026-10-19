// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import {
    clearPlayerSessions,
    PLAYER_SESSION_PREFIX,
    readPlayerSession,
    writePlayerSession,
    type PlayerSession,
} from "./playerSession";
const key = PLAYER_SESSION_PREFIX + "account/experiment/course";
const state: PlayerSession = {
    currentIndex: 1,
    highestUnlockedIndex: 1,
    completed: [0],
    answersByPage: { 0: {} },
    submissions: [
        {
            id: "answer",
            questionId: "question",
            createdAt: "now",
            userId: "student",
            experimentId: "exp",
            textAnswer: "answer",
        },
    ],
    startedAt: "now",
};
beforeEach(() => sessionStorage.clear());
it("restores the visited page and submission IDs together, avoiding resubmission after reload", () => {
    writePlayerSession(key, "revision", state);
    expect(readPlayerSession(key, "revision", 3)).toEqual(state);
});
it("rejects another course revision and invalid navigation", () => {
    writePlayerSession(key, "revision", state);
    expect(readPlayerSession(key, "new revision", 3)).toBeUndefined();
    writePlayerSession(key, "revision", { ...state, currentIndex: 2 });
    expect(readPlayerSession(key, "revision", 3)).toBeUndefined();
});
it("logout clears the local player snapshot while retaining unrelated data", () => {
    writePlayerSession(key, "revision", state);
    sessionStorage.setItem("other", "keep");
    clearPlayerSessions();
    expect(readPlayerSession(key, "revision", 3)).toBeUndefined();
    expect(sessionStorage.getItem("other")).toBe("keep");
});

it("isolates simulation state by account and experiment and clears it at logout", () => {
    const first =
        PLAYER_SESSION_PREFIX +
        JSON.stringify(["student-a", "experiment-a", "course"]);
    writePlayerSession(first, "revision", {
        ...state,
        simulationState: { led: false, partition: true },
    });
    expect(readPlayerSession(first, "revision", 3)?.simulationState).toEqual({
        led: false,
        partition: true,
    });
    for (const scope of [
        ["student-b", "experiment-a", "course"],
        ["student-a", "experiment-b", "course"],
    ]) {
        expect(
            readPlayerSession(
                PLAYER_SESSION_PREFIX + JSON.stringify(scope),
                "revision",
                3
            )
        ).toBeUndefined();
    }
    clearPlayerSessions();
    expect(readPlayerSession(first, "revision", 3)).toBeUndefined();
});
