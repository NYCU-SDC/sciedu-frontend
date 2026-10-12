import { describe, expect, it } from "vitest";
import { demoExperiment } from "../data/demoAdminData";
import {
    buildExperimentPayload,
    toTaipeiInputValue,
    type ExperimentDraft,
} from "./experimentDraft";
import type { ExperimentDetail } from "../types";

const original: ExperimentDetail = {
    ...demoExperiment,
    status: "DRAFT",
    scheduledStartAt: "2026-07-01T01:00:33.123Z",
    configuration: {
        ...demoExperiment.configuration,
        gradingMode: "MANUAL",
        showScore: false,
        showExplanations: true,
        allowRetry: false,
        correctAnswerReleaseMode: "NEVER",
    },
};
const draft: ExperimentDraft = {
    name: original.name,
    description: original.description ?? "",
    startsAt: toTaipeiInputValue(original.scheduledStartAt),
    endsAt: toTaipeiInputValue(original.scheduledEndAt),
    maxAttempts: "2",
    result: "explanations",
    release: "never",
    courseIds: [],
};

describe("experiment edit payload", () => {
    it("preserves unrepresentable settings and timestamp precision when editing a name", () => {
        const result = buildExperimentPayload(
            { ...draft, name: "new name" },
            original
        );
        expect(result.configuration).toEqual(original.configuration);
        expect(result.scheduledStartAt).toBe(original.scheduledStartAt);
        expect(result.scheduledEndAt).toBe(original.scheduledEndAt);
        expect(result.name).toBe("new name");
    });
    it("updates only the end time of an active experiment", () => {
        const result = buildExperimentPayload(
            {
                ...draft,
                name: "ignored",
                result: "score",
                maxAttempts: "5",
                endsAt: "2026-08-01T18:00",
            },
            { ...original, status: "ACTIVE" }
        );
        expect(result.configuration).toEqual(original.configuration);
        expect(result.name).toBe(original.name);
        expect(result.scheduledStartAt).toBe(original.scheduledStartAt);
        expect(result.scheduledEndAt).toBe("2026-08-01T10:00:00.000Z");
    });
    it("applies explicit editable selections", () => {
        const result = buildExperimentPayload(
            {
                ...draft,
                result: "score",
                maxAttempts: "3",
                release: "page",
                description: "",
            },
            original
        );
        expect(result.configuration).toMatchObject({
            showScore: true,
            showExplanations: false,
            maxAttempts: 3,
            allowRetry: true,
            gradingMode: "MANUAL",
            correctAnswerReleaseMode: "AFTER_PAGE_SUBMISSION",
        });
        expect(result.description).toBe("");
    });
});
