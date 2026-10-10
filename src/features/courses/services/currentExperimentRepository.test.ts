// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { getCurrentExperiment } from "./currentExperimentRepository";

function response(status: number, body?: unknown) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: vi.fn().mockResolvedValue(body),
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("currentExperimentRepository", () => {
    it("returns null when there is no current experiment", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(response(404, { detail: "not found" }))
        );

        await expect(getCurrentExperiment()).resolves.toBeNull();
    });

    it.each([401, 403, 500])(
        "keeps HTTP %s as an API error",
        async (status) => {
            vi.stubGlobal(
                "fetch",
                vi
                    .fn()
                    .mockResolvedValue(response(status, { detail: "failed" }))
            );

            await expect(getCurrentExperiment()).rejects.toMatchObject({
                status,
            });
        }
    );

    it("loads the current experiment and keeps only published courses", async () => {
        const publishedCourse = {
            id: "10000000-0000-4000-8000-000000000001",
            code: "GEN-01",
            title: "教材一",
            status: "PUBLISHED",
            createdAt: "2026-09-01T00:00:00Z",
            updatedAt: "2026-09-01T00:00:00Z",
        };
        const secondPublishedCourse = {
            ...publishedCourse,
            id: "10000000-0000-4000-8000-000000000002",
            code: "GEN-02",
            title: "教材二",
        };
        const experiment = {
            id: "20000000-0000-4000-8000-000000000001",
            name: "目前實驗",
            scheduledStartAt: "2026-09-01T00:00:00Z",
            scheduledEndAt: "2026-09-30T00:00:00Z",
            status: "ACTIVE",
        };
        const fetchMock = vi.fn().mockResolvedValue(
            response(200, {
                experiment,
                courses: [
                    publishedCourse,
                    {
                        ...publishedCourse,
                        id: "10000000-0000-4000-8000-000000000003",
                        status: "DRAFT",
                    },
                    secondPublishedCourse,
                ],
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        await expect(getCurrentExperiment()).resolves.toEqual({
            experiment,
            courses: [publishedCourse, secondPublishedCourse],
        });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock.mock.calls[0][0]).toContain(
            "/api/experiments/current"
        );
    });
});
