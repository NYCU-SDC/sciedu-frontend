// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../shared/utils/api";
import { theme } from "../../mantineTheme";
import Homepage from "./Homepage/Homepage";
import MaterialLibrary from "./MaterialLibrary/MaterialLibrary";

const mocks = vi.hoisted(() => ({
    useCurrentExperimentCourses: vi.fn(),
}));

vi.mock("./services/currentExperimentQueries", () => ({
    useCurrentExperimentCourses: mocks.useCurrentExperimentCourses,
}));

const experiment = {
    id: "20000000-0000-4000-8000-000000000001",
    name: "目前實驗",
    description: "實驗說明",
    scheduledStartAt: "2026-09-01T00:00:00Z",
    scheduledEndAt: "2026-09-30T00:00:00Z",
    status: "ACTIVE",
};

const courses = [1, 2, 3].map((number) => ({
    id: `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
    code: `COURSE-${number}`,
    title: `教材${number}`,
    description: `教材${number}說明`,
    status: "PUBLISHED",
    createdAt: "2026-09-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
}));

function LocationProbe() {
    return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderFlow(initialEntry = "/courses") {
    return render(
        <MantineProvider theme={theme}>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/courses" element={<Homepage />} />
                    <Route
                        path="/courses/library"
                        element={<MaterialLibrary />}
                    />
                    <Route path="/course/:id" element={<LocationProbe />} />
                    <Route path="/login" element={<LocationProbe />} />
                </Routes>
            </MemoryRouter>
        </MantineProvider>
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

function mockSuccess() {
    mocks.useCurrentExperimentCourses.mockReturnValue({
        experiment,
        courses,
        error: null,
        isPending: false,
        refetch: vi.fn(),
    });
}

describe("current experiment course navigation", () => {
    it.each(courses)("opens $title from the homepage", (course) => {
        mockSuccess();
        renderFlow();

        fireEvent.click(
            screen.getByRole("button", { name: `開啟教材 ${course.title}` })
        );

        expect(screen.getByTestId("location").textContent).toBe(
            `/course/${course.id}`
        );
    });

    it("navigates from homepage to library and then to a course", () => {
        mockSuccess();
        renderFlow();

        fireEvent.click(screen.getByRole("button", { name: "查看教材書櫃" }));
        expect(screen.getByRole("heading", { name: "教材書櫃" })).toBeTruthy();

        fireEvent.click(screen.getAllByRole("button", { name: "開啟教材" })[0]);
        expect(screen.getByTestId("location").textContent).toBe(
            `/course/${courses[0].id}`
        );
    });

    it("shows the empty state when there is no current experiment", () => {
        mocks.useCurrentExperimentCourses.mockReturnValue({
            experiment: null,
            courses: [],
            error: null,
            isPending: false,
            refetch: vi.fn(),
        });

        renderFlow();

        expect(screen.getByText("目前沒有進行中的實驗")).toBeTruthy();
    });

    it("shows the empty state when the current experiment has no courses", () => {
        mocks.useCurrentExperimentCourses.mockReturnValue({
            experiment,
            courses: [],
            error: null,
            isPending: false,
            refetch: vi.fn(),
        });

        renderFlow();

        expect(screen.getByText("目前實驗尚未指派教材")).toBeTruthy();
    });

    it("does not show courses from a non-active experiment", () => {
        mocks.useCurrentExperimentCourses.mockReturnValue({
            experiment: { ...experiment, status: "SCHEDULED" },
            courses,
            error: null,
            isPending: false,
            refetch: vi.fn(),
        });

        renderFlow();

        expect(screen.getByText("目前沒有進行中的實驗")).toBeTruthy();
        expect(screen.queryByText(courses[0].title)).toBeNull();
    });

    it("handles unauthorized responses by linking to login", () => {
        mocks.useCurrentExperimentCourses.mockReturnValue({
            experiment: null,
            courses: [],
            error: new ApiError("unauthorized", 401),
            isPending: false,
            refetch: vi.fn(),
        });

        renderFlow();
        fireEvent.click(screen.getByRole("button", { name: "重新登入" }));

        expect(screen.getByTestId("location").textContent).toBe("/login");
    });

    it("handles forbidden and server errors", () => {
        const refetch = vi.fn();
        mocks.useCurrentExperimentCourses.mockReturnValueOnce({
            experiment: null,
            courses: [],
            error: new ApiError("forbidden", 403),
            isPending: false,
            refetch,
        });
        const view = renderFlow();
        expect(screen.getByText("無法查看目前實驗")).toBeTruthy();

        view.unmount();
        mocks.useCurrentExperimentCourses.mockReturnValueOnce({
            experiment: null,
            courses: [],
            error: new ApiError("server error", 500),
            isPending: false,
            refetch,
        });
        renderFlow();
        fireEvent.click(screen.getByRole("button", { name: "重新載入" }));
        expect(refetch).toHaveBeenCalledOnce();
    });
});
