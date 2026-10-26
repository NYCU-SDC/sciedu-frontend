// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../shared/utils/api";
import { demoExperiment } from "../data/demoAdminData";
import {
    fetchExperiment,
    updateExperimentStatus,
} from "../services/adminRepository";
import { useExperimentArchive } from "./useExperimentArchive";
import { toast } from "sonner";

vi.mock("../services/adminRepository", () => ({
    fetchExperiment: vi.fn(),
    updateExperimentStatus: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
const active = {
    ...demoExperiment,
    status: "ACTIVE" as const,
    courseCount: 1,
    participantCount: 1,
};
const archived = { ...active, status: "ARCHIVED" as const };
const detailKey = ["admin", "experiments", active.id, "detail"];
const currentKey = ["student", "current-experiment", "student@example.test"];
function setup() {
    const client = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    client.setQueryData(detailKey, active);
    client.setQueryData(["admin", "experiments", "list"], [active]);
    client.setQueryData(currentKey, active);
    const hook = renderHook(() => useExperimentArchive(active.id), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        ),
    });
    return { ...hook, client };
}
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("experiment archive recovery", () => {
    it("archives directly and invalidates list and current experiment while retaining detail", async () => {
        vi.mocked(updateExperimentStatus).mockResolvedValue(archived);
        const { result, client } = setup();
        await act(async () => {
            expect(await result.current.run()).toBe(true);
        });
        expect(updateExperimentStatus).toHaveBeenCalledExactlyOnceWith(
            active.id,
            "ARCHIVED",
            expect.any(AbortSignal)
        );
        expect(client.getQueryData(detailKey)).toEqual(archived);
        expect(client.getQueryState(currentKey)?.isInvalidated).toBe(true);
        expect(
            client.getQueryState(["admin", "experiments", "list"])
                ?.isInvalidated
        ).toBe(true);
        expect(fetchExperiment).not.toHaveBeenCalled();
    });
    it("does not wait for unrelated list refreshes after confirmed success", async () => {
        vi.mocked(updateExperimentStatus).mockResolvedValue(archived);
        const { result, client } = setup();
        vi.spyOn(client, "invalidateQueries").mockReturnValue(
            new Promise(() => {})
        );
        await act(async () => {
            expect(await result.current.run()).toBe(true);
        });
        expect(result.current.isPending).toBe(false);
        expect(client.getQueryData(detailKey)).toEqual(archived);
    });
    it("blocks duplicate requests while saving", async () => {
        let finish!: (value: typeof archived) => void;
        vi.mocked(updateExperimentStatus).mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const { result } = setup();
        let pending!: Promise<boolean>;
        act(() => {
            pending = result.current.run();
        });
        await act(async () => {
            expect(await result.current.run()).toBe(false);
        });
        expect(updateExperimentStatus).toHaveBeenCalledTimes(1);
        await act(async () => {
            finish(archived);
            await pending;
        });
    });
    it.each([
        new TypeError("Failed to fetch"),
        new DOMException("timeout", "TimeoutError"),
        new ApiError("bad gateway", 502),
    ])("checks a lost response instead of resending (%s)", async (error) => {
        vi.mocked(updateExperimentStatus).mockRejectedValue(error);
        vi.mocked(fetchExperiment).mockResolvedValue(archived);
        const { result } = setup();
        await act(async () => {
            expect(await result.current.run()).toBe(true);
        });
        expect(updateExperimentStatus).toHaveBeenCalledTimes(1);
        expect(fetchExperiment).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledTimes(1);
    });
    it("allows an explicit retry only after confirming the experiment is not archived", async () => {
        vi.mocked(updateExperimentStatus)
            .mockRejectedValueOnce(new TypeError("offline"))
            .mockResolvedValueOnce(archived);
        vi.mocked(fetchExperiment).mockResolvedValue(active);
        const { result } = setup();
        await act(async () => {
            expect(await result.current.run()).toBe(false);
        });
        expect(result.current.needsVerification).toBe(false);
        expect(result.current.error).toContain("尚未封存");
        expect(toast.success).not.toHaveBeenCalled();
        await act(async () => {
            expect(await result.current.run()).toBe(true);
        });
    });
    it("locks unknown outcomes to GET verification, including subsequent failures", async () => {
        vi.mocked(updateExperimentStatus).mockRejectedValue(
            new TypeError("offline")
        );
        vi.mocked(fetchExperiment).mockRejectedValue(new TypeError("offline"));
        const { result } = setup();
        await act(async () => {
            await result.current.run();
        });
        expect(result.current.needsVerification).toBe(true);
        await act(async () => {
            await result.current.run();
            await result.current.run(true);
        });
        expect(updateExperimentStatus).toHaveBeenCalledTimes(1);
        expect(result.current.needsVerification).toBe(true);
        vi.mocked(fetchExperiment).mockResolvedValue(archived);
        await act(async () => {
            expect(await result.current.run(true)).toBe(true);
        });
        expect(updateExperimentStatus).toHaveBeenCalledTimes(1);
        expect(result.current.needsVerification).toBe(false);
    });
    it("unlocks after a later verification confirms no archive", async () => {
        vi.mocked(updateExperimentStatus).mockRejectedValue(
            new TypeError("offline")
        );
        vi.mocked(fetchExperiment)
            .mockRejectedValueOnce(new TypeError("offline"))
            .mockResolvedValueOnce(active);
        const { result } = setup();
        await act(async () => {
            await result.current.run();
        });
        await act(async () => {
            expect(await result.current.run(true)).toBe(false);
        });
        expect(result.current.needsVerification).toBe(false);
        expect(result.current.error).toContain("尚未封存");
    });
    it.each([401, 403, 404, 409])(
        "does not treat HTTP %i as success even if another actor archived",
        async (status) => {
            vi.mocked(updateExperimentStatus).mockRejectedValue(
                new ApiError("rejected", status)
            );
            vi.mocked(fetchExperiment).mockResolvedValue(archived);
            const { result, client } = setup();
            await act(async () => {
                expect(await result.current.run()).toBe(false);
            });
            expect(result.current.error).toBeTruthy();
            expect(toast.success).not.toHaveBeenCalled();
            expect(client.getQueryData(detailKey)).toEqual(archived);
        }
    );
    it("does not accept a success response with the wrong status", async () => {
        vi.mocked(updateExperimentStatus).mockResolvedValue(active);
        const { result } = setup();
        await act(async () => {
            expect(await result.current.run()).toBe(false);
        });
        expect(result.current.needsVerification).toBe(true);
        expect(toast.success).not.toHaveBeenCalled();
    });
});
