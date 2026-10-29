// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import { parsePresentation, CCM_NOTICE, validCCMState } from "./presentation";
import {
    readPlayerSession,
    writePlayerSession,
    clearPlayerSessions,
} from "./playerSession";
import { resolveAnswerReferences } from "./answerReferences";
import type { CourseDefinition } from "../genetics/types/types";
import {
    type MaterialContext,
    CCM_CODE,
    CCM_PRESET,
    decodeMaterialMessage,
    encodeMaterialMessage,
} from "../../../shared/network/materialChat";
import manifest from "../../../../tools/ccm/manifest.json";
beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
});
it("maps seven sequential pages, only two chats and twelve TEXT responses", () => {
    expect(manifest.pages).toHaveLength(7);
    expect(manifest.pages.flatMap((p) => p.questions)).toHaveLength(12);
    manifest.pages.forEach((p, i) =>
        expect(() =>
            parsePresentation(JSON.stringify(p.presentation), i)
        ).not.toThrow()
    );
    expect(manifest.pages.map((p) => p.presentation.chatEnabled)).toEqual([
        false,
        false,
        true,
        false,
        false,
        true,
        false,
    ]);
    expect(manifest.pages[4].presentation.notice).toBe("ccm-linear-test");
    expect(CCM_NOTICE).toBe(
        "目前教材處於測試階段，因此採用完整學習流程，所有學生皆進入 Mental Set 2。"
    );
});
it("rejects invalid references, options and unknown simulation payloads", () => {
    const base = manifest.pages[5].presentation;
    for (const bad of [
        {
            answerReferences: [
                { pageIndex: 5, questionIndex: 0, label: "bad" },
            ],
        },
        { textChoices: { 1: ["相同", "相同"] } },
        { simulationId: "arbitrary-url" },
        { mentalSet: 3 },
    ]) {
        expect(() =>
            parsePresentation(JSON.stringify({ ...base, ...bad }), 5)
        ).toThrow();
    }
    expect(validCCMState("ccm-heart-v1", { position: 2.5, speed: 0.65 })).toBe(
        true
    );
    expect(validCCMState("ccm-marrow-v1", { position: 3, speed: 1 })).toBe(
        true
    );
    expect(validCCMState("ccm-marrow-v1", { position: 4, speed: 1 })).toBe(
        false
    );
    expect(validCCMState("ccm-heart-v1", { position: NaN, speed: 1 })).toBe(
        false
    );
});
it("persists independent simulation settings and notice dismissal, isolates scope, clears on logout", () => {
    const key = "sciedu-course-player:v1:dev/account/experiment/course";
    const state = {
        currentIndex: 4,
        highestUnlockedIndex: 4,
        completed: [0, 1, 2, 3],
        answersByPage: {},
        submissions: [],
        startedAt: "now",
        dismissedNotices: ["ccm-linear-test"],
        simulationState: { led: false, partition: true },
        ccmSimulationStates: {
            "ccm-heart-v1": { position: 2, speed: 0.65 },
            "ccm-marrow-v1": { position: 3, speed: 1 },
        },
    };
    writePlayerSession(key, "rev", state);
    expect(readPlayerSession(key, "rev", 7)).toEqual(state);
    expect(readPlayerSession(key + "other", "rev", 7)).toBeUndefined();
    clearPlayerSessions();
    expect(readPlayerSession(key, "rev", 7)).toBeUndefined();
});
it("answer table uses explicit reference order and never another experiment's answer", () => {
    const definition = {
        pages: [
            {
                pageIndex: 0,
                request: {
                    type: "material",
                    questionSections: [{ questionId: "q" }],
                },
            },
        ],
    } as CourseDefinition;
    const refs = [
        { pageIndex: 0, questionIndex: 0, label: "第一頁：心臟功能的原始預測" },
    ];
    const submissions = [
        {
            id: "a",
            questionId: "q",
            experimentId: "other",
            userId: "u",
            createdAt: "now",
            textAnswer: "FOREIGN",
        },
    ];
    expect(
        resolveAnswerReferences(refs, definition, {}, submissions, "current")[0]
            .answer
    ).toBe("尚未取得本次回答");
    expect(
        resolveAnswerReferences(
            refs,
            definition,
            { 0: { q: "draft" } },
            submissions,
            "current"
        )[0].answer
    ).toBe("draft");
    submissions[0].experimentId = "current";
    expect(
        resolveAnswerReferences(refs, definition, {}, submissions, "current")[0]
            .status
    ).toBe("已確認提交");
});
it("CCM envelope round trips for history and edits, mismatched preset is not trusted", () => {
    const context: MaterialContext = {
        version: 1 as const,
        preset: CCM_PRESET,
        snapshot: {
            capturedAt: "now",
            course: { id: "c", code: CCM_CODE, title: "CCM" },
            experimentId: "e",
            page: {
                id: "p",
                title: "discussion",
                stage: "ccm-discussion",
                body: "body",
                descriptions: ["hidden"],
            },
            questions: [],
            simulations: { "ccm-marrow-v1": { position: 2, speed: 1 } },
        },
    };
    const wire = encodeMaterialMessage("hello", context);
    expect(decodeMaterialMessage(wire)?.text).toBe("hello");
    expect(
        decodeMaterialMessage(encodeMaterialMessage("edit", context))?.context
    ).toEqual(context);
    expect(
        decodeMaterialMessage(
            wire.replace(CCM_PRESET, "augmentation_teacher_and_peer")
        )
    ).toBeNull();
});
