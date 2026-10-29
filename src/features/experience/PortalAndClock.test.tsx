// @vitest-environment jsdom
import {
    act,
    cleanup,
    render,
    renderHook,
    screen,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import PortalHome from "./PortalHome";
import { useExperimentClock } from "./useExperimentClock";
import { displayStatus } from "./experimentExperience";
const mock = vi.hoisted(() => ({ roles: ["STUDENT"], fetch: vi.fn() }));
vi.mock("../../shared/auth", () => ({
    useAuth: () => ({ session: { username: "測試者" }, logout: vi.fn() }),
}));
vi.mock("../../shared/hooks", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("../admin/services/adminRepository", () => ({
    fetchCurrentUser: async () => ({ roles: mock.roles }),
}));
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});
it.each(["dev", "edu", "llm"])(
    "gates portal entries by %s deployment and administrator role",
    async (mode) => {
        vi.stubEnv("VITE_APP_MODE", mode);
        mock.roles = ["ADMIN"];
        const client = new QueryClient();
        render(
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <PortalHome />
                </MemoryRouter>
            </QueryClientProvider>
        );
        if (mode !== "llm")
            expect(
                await screen.findByRole("link", { name: /實驗管理/ })
            ).toBeTruthy();
        else
            expect(screen.queryByRole("link", { name: /實驗管理/ })).toBeNull();
        expect(Boolean(screen.queryByRole("link", { name: /教材 進入/ }))).toBe(
            mode !== "llm"
        );
        expect(Boolean(screen.queryByRole("link", { name: /AI 聊天/ }))).toBe(
            mode !== "edu"
        );
        cleanup();
        client.clear();
    }
);
it("does not offer management to students", async () => {
    mock.roles = ["STUDENT"];
    const client = new QueryClient();
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <PortalHome />
            </MemoryRouter>
        </QueryClientProvider>
    );
    await screen.findByRole("link", { name: /教材 進入/ });
    expect(screen.queryByRole("link", { name: /實驗管理/ })).toBeNull();
    cleanup();
    client.clear();
});
it("updates at exact time boundaries and when a background tab returns", () => {
    vi.useFakeTimers();
    const start = Date.parse("2026-10-27T09:00:00+08:00");
    vi.setSystemTime(start - 1);
    const experiment = {
        status: "ACTIVE" as const,
        scheduledStartAt: new Date(start).toISOString(),
        scheduledEndAt: new Date(start + 1000).toISOString(),
    };
    const v = renderHook(() =>
        displayStatus(experiment, useExperimentClock([experiment]))
    );
    expect(v.result.current).toBe("NOT_STARTED");
    act(() => vi.advanceTimersByTime(1));
    expect(v.result.current).toBe("ACTIVE");
    act(() => vi.advanceTimersByTime(1000));
    expect(v.result.current).toBe("ENDED");
    act(() => {
        vi.setSystemTime(start - 500);
        window.dispatchEvent(new Event("focus"));
    });
    expect(v.result.current).toBe("NOT_STARTED");
});
