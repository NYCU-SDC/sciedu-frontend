// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    demoExperiment,
    demoCourses,
    demoParticipants,
} from "../data/demoAdminData";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
});

describe("admin demo isolation", () => {
    it("creates, updates and assigns within the demo without calling fetch", async () => {
        vi.stubEnv("VITE_ADMIN_DEMO_MODE", "true");
        vi.resetModules();
        const fetchMock = vi
            .fn()
            .mockRejectedValue(new Error("Network must not be used"));
        vi.stubGlobal("fetch", fetchMock);
        const repo = await import("./adminRepository");
        const payload = {
            name: "demo test",
            description: "test",
            scheduledStartAt: demoExperiment.scheduledStartAt,
            scheduledEndAt: demoExperiment.scheduledEndAt,
            configuration: demoExperiment.configuration,
        };
        const created = await repo.createExperiment(payload);
        expect(created.status).toBe("DRAFT");
        expect(created.id).not.toBe(demoExperiment.id);
        await repo.updateExperiment(created.id, {
            ...payload,
            name: "updated demo",
        });
        await repo.updateExperimentStatus(created.id, "SCHEDULED");
        await repo.addExperimentCourses(created.id, [demoCourses[0].course.id]);
        await repo.addExperimentParticipants(created.id, [
            demoParticipants[0].participant.id,
        ]);
        expect(await repo.fetchExperiment(created.id)).toMatchObject({
            name: "updated demo",
            status: "SCHEDULED",
            courseCount: 1,
            participantCount: 1,
        });
        expect(
            (await repo.listExperiments({ search: "updated demo" })).items
        ).toHaveLength(1);
        expect(await repo.fetchExperiment(demoExperiment.id)).toMatchObject({
            courseCount: demoCourses.length,
            participantCount: demoParticipants.length,
        });
        await repo.removeExperimentCourse(created.id, demoCourses[0].course.id);
        await repo.removeExperimentParticipant(
            created.id,
            demoParticipants[0].participant.id
        );
        expect(await repo.listExperimentCourses(created.id)).toEqual([]);
        expect(await repo.listExperimentParticipants(created.id)).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });
    it("uses the configured API outside demo mode", async () => {
        vi.stubEnv("VITE_ADMIN_DEMO_MODE", "false");
        vi.resetModules();
        const fetchMock = vi
            .fn()
            .mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => demoExperiment,
            });
        vi.stubGlobal("fetch", fetchMock);
        const repo = await import("./adminRepository");
        await repo.updateExperimentStatus(demoExperiment.id, "COMPLETED");
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining(
                `/api/experiments/${demoExperiment.id}/status`
            ),
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify({ status: "COMPLETED" }),
            })
        );
    });
});
