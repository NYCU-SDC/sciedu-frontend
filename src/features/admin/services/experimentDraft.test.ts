import { describe, expect, it } from "vitest";
import { demoExperiment } from "../data/demoAdminData";
import {
    buildExperimentPayload,
    experimentToDraft,
    feedbackSummary,
    retryLabel,
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
describe("experiment settings", () => {
    for (const showScore of [false, true])
        for (const showExplanations of [false, true])
            for (const release of [
                "NEVER",
                "AFTER_PAGE_SUBMISSION",
                "AFTER_COURSE_COMPLETION",
            ] as const) {
                it(`round trips independent feedback settings: ${showScore}/${showExplanations}/${release}`, () => {
                    const experiment = {
                        ...original,
                        configuration: {
                            ...original.configuration,
                            showScore,
                            showExplanations,
                            correctAnswerReleaseMode: release,
                        },
                    };
                    const result = buildExperimentPayload(
                        experimentToDraft(experiment),
                        experiment
                    );
                    expect(result.configuration).toEqual(
                        experiment.configuration
                    );
                    expect(result.scheduledStartAt).toBe(
                        experiment.scheduledStartAt
                    );
                    expect(result.scheduledEndAt).toBe(
                        experiment.scheduledEndAt
                    );
                });
            }
    it("changing score does not change explanations, retry, or release", () => {
        const draft = experimentToDraft(original);
        expect(
            buildExperimentPayload({ ...draft, showScore: true }, original)
                .configuration
        ).toEqual({ ...original.configuration, showScore: true });
        expect(
            buildExperimentPayload(
                { ...draft, showExplanations: false },
                original
            ).configuration
        ).toEqual({ ...original.configuration, showExplanations: false });
        expect(
            buildExperimentPayload({ ...draft, release: "page" }, original)
                .configuration
        ).toEqual({
            ...original.configuration,
            correctAnswerReleaseMode: "AFTER_PAGE_SUBMISSION",
        });
    });
    it("preserves all locked fields in ACTIVE", () => {
        const result = buildExperimentPayload(
            {
                ...experimentToDraft(original),
                name: "ignored",
                showScore: true,
                showExplanations: false,
                allowRetry: true,
                maxAttempts: "5",
                release: "course",
                endsAt: "2026-08-01T18:00",
            },
            { ...original, status: "ACTIVE" }
        );
        expect(result.configuration).toEqual(original.configuration);
        expect(result.name).toBe(original.name);
        expect(result.scheduledStartAt).toBe(original.scheduledStartAt);
        expect(result.scheduledEndAt).toBe("2026-08-01T10:00:00.000Z");
    });
    it("stores total attempts without changing feedback", () => {
        const draft = {
            ...experimentToDraft(original),
            maxAttempts: "3",
            allowRetry: true,
        };
        expect(buildExperimentPayload(draft, original).configuration).toEqual({
            ...original.configuration,
            maxAttempts: 3,
            allowRetry: true,
        });
        expect(retryLabel(draft)).toBe("可重新作答 2 次（共 3 次）");
    });
    it("summarizes independently selected feedback and retry after answer release", () => {
        const draft = {
            ...experimentToDraft(original),
            showScore: true,
            showExplanations: false,
            release: "page" as const,
            allowRetry: true,
            maxAttempts: "2",
        };
        expect(feedbackSummary(draft)).toContain(
            "學生可查看分數與答對答錯，不顯示評分說明"
        );
        expect(feedbackSummary(draft)).toContain("各頁必要作答提交成功後公開");
        expect(feedbackSummary(draft)).toContain(
            "正確答案公開後仍可在次數上限內重新作答"
        );
        expect(feedbackSummary({ ...draft, release: "never" })).not.toContain(
            "公開後仍可"
        );
    });
});
