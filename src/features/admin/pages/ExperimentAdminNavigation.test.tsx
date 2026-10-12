// @vitest-environment jsdom

import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { theme } from "../../../mantineTheme";
import ExperimentListPage from "./ExperimentListPage";

vi.mock("../services/adminRepository", () => ({
    fetchCurrentUser: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "admin@example.com",
        name: "管理員",
        roles: ["ADMIN"],
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
    }),
    listExperiments: vi.fn().mockResolvedValue({
        items: [
            {
                id: "experiment-1",
                name: "可操作實驗",
                scheduledStartAt: "2026-09-10T01:00:00Z",
                scheduledEndAt: "2026-09-10T08:00:00Z",
                status: "DRAFT",
                configuration: {
                    maxAttempts: 1,
                    allowRetry: false,
                    showScore: true,
                    showExplanations: false,
                    gradingMode: "AUTOMATIC",
                    correctAnswerReleaseMode: "AFTER_COURSE_COMPLETION",
                },
                createdBy: "user-1",
                createdAt: "2026-09-01T00:00:00Z",
                updatedAt: "2026-09-01T00:00:00Z",
            },
        ],
        totalPages: 1,
        totalItems: 1,
        currentPage: 1,
        pageSize: 20,
        hasNextPage: false,
    }),
}));

function LocationProbe() {
    const location = useLocation();
    return (
        <output data-testid="location">
            {location.pathname}
            {location.search}
        </output>
    );
}

function renderExperimentList() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
                <MemoryRouter initialEntries={["/admin/experiments"]}>
                    <Routes>
                        <Route
                            path="/admin/experiments"
                            element={
                                <>
                                    <ExperimentListPage />
                                    <LocationProbe />
                                </>
                            }
                        />
                        <Route path="*" element={<LocationProbe />} />
                    </Routes>
                </MemoryRouter>
            </MantineProvider>
        </QueryClientProvider>
    );
}

beforeAll(() => {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe("admin experiment navigation", () => {
    it("opens the create experiment flow", async () => {
        renderExperimentList();

        fireEvent.click(
            await screen.findByRole("button", { name: "新增實驗" })
        );

        expect(screen.getByTestId("location").textContent).toBe(
            "/admin/experiments/new"
        );
    });

    it("opens people management from the experiment sidebar", async () => {
        renderExperimentList();

        fireEvent.click(
            await screen.findByRole("button", { name: "人員管理" })
        );

        expect(screen.getByTestId("location").textContent).toBe(
            "/admin?section=people"
        );
    });

    it("opens an experiment from the list row", async () => {
        renderExperimentList();

        const experimentName = await screen.findByText("可操作實驗");
        await waitFor(() =>
            expect(experimentName.closest("tr")).not.toBeNull()
        );
        fireEvent.click(experimentName.closest("tr")!);

        expect(screen.getByTestId("location").textContent).toBe(
            "/admin/experiments/experiment-1"
        );
    });
});
