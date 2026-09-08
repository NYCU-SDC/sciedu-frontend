import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const payload = {
    name: "Demo experiment",
    description: "Frontend-only fixture",
    scheduledStartAt: "2026-09-10T01:00:00.000Z",
    scheduledEndAt: "2026-09-10T08:00:00.000Z",
    configuration: {
        maxAttempts: 1,
        allowRetry: false,
        showScore: true,
        showExplanations: true,
        gradingMode: "AUTOMATIC" as const,
        correctAnswerReleaseMode: "AFTER_COURSE_COMPLETION" as const,
    },
};

describe("admin demo repository", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("keeps participant state isolated for each experiment", async () => {
        const repository = await import("./adminRepository");
        const { DEMO_EXPERIMENT_ID, demoCandidateUsers } =
            await import("../data/demoAdminData");

        const created = await repository.createExperiment(payload);

        expect(
            await repository.listExperimentParticipants(DEMO_EXPERIMENT_ID)
        ).toHaveLength(12);
        expect(
            await repository.listExperimentParticipants(created.id)
        ).toHaveLength(0);

        await repository.addExperimentParticipants(created.id, [
            demoCandidateUsers[0].id,
        ]);

        expect(
            await repository.listExperimentParticipants(created.id)
        ).toHaveLength(1);
        expect(
            await repository.listExperimentParticipants(DEMO_EXPERIMENT_ID)
        ).toHaveLength(12);

        const experiments = await repository.listExperiments();
        expect(
            (
                experiments.items.find((item) => item.id === created.id) as
                    | { participantCount?: number }
                    | undefined
            )?.participantCount
        ).toBe(1);
    });
});
