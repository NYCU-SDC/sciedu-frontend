// @vitest-environment jsdom
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { ApiError } from "../../../shared/utils/api";
import GeneticsCourse from "./GeneticsCourse";
import { loadCourseAttempt } from "./services/courseAttempt";
const mocks = vi.hoisted(() => ({
    login: vi.fn(),
    experiment: {
        isPending: false,
        error: null as unknown,
        experiment: { status: "ACTIVE" },
        courses: [{ id: "10000000-0000-4000-8000-000000000001" }],
        refetch: vi.fn(),
    },
}));
const courseId = "10000000-0000-4000-8000-000000000001";
const answer = {
    id: "answer",
    questionId: "q",
    experimentId: "experiment",
    userId: "user",
    createdAt: "2026-10-10T00:00:00Z",
    textAnswer: "回答",
};
vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({
        session: { email: "student@example.com" },
        login: mocks.login,
    }),
}));
vi.mock("../services/currentExperimentQueries", () => ({
    useCurrentExperimentCourses: () => mocks.experiment,
}));
vi.mock("@tanstack/react-query", () => ({
    useQuery: () => ({
        data: {
            title: "正式教材",
            pages: [
                {
                    pageIndex: 0,
                    activeNavbarTitles: [0],
                    secondaryTitle: "最後一頁",
                    request: {
                        type: "material",
                        content: { imageIds: [], descriptionId: "d" },
                        questionSections: [],
                    },
                },
            ],
        },
        isPending: false,
        isError: false,
    }),
    useQueryClient: () => ({ prefetchQuery: vi.fn() }),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("../../../shared/hooks", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("./components/Navbar", () => ({ default: () => null }));
vi.mock("./components/useCourseChatController", () => ({
    useCourseChatController: () => ({}),
}));
vi.mock("./layouts/Material", () => ({
    default: ({
        onAnswersSubmitted,
        onNext,
    }: {
        onAnswersSubmitted: (values: unknown[]) => void;
        onNext: () => void;
    }) => (
        <button
            onClick={() => {
                onAnswersSubmitted([answer]);
                onNext();
            }}
        >
            送出最後一頁
        </button>
    ),
}));
function Destination() {
    const location = useLocation();
    return (
        <output data-testid="destination">
            {JSON.stringify({ search: location.search, state: location.state })}
        </output>
    );
}
function mount() {
    return render(
        <MemoryRouter initialEntries={["/course/" + courseId]}>
            <Routes>
                <Route path="/course/:id" element={<GeneticsCourse />} />
                <Route path="/courses/summary" element={<Destination />} />
            </Routes>
        </MemoryRouter>
    );
}
beforeEach(() => {
    sessionStorage.clear();
    mocks.experiment.error = null;
    mocks.login.mockClear();
});
afterEach(cleanup);
describe("Current Experiment course completion", () => {
    it("saves the last-page submission before navigating to the matching summary", () => {
        mount();
        fireEvent.click(screen.getByText("送出最後一頁"));
        const attempt = loadCourseAttempt(courseId, "student@example.com");
        expect(attempt?.submissions).toEqual([answer]);
        expect(attempt?.courseTitle).toBe("正式教材");
        const destination = JSON.parse(
            screen.getByTestId("destination").textContent!
        );
        expect(destination.search).toBe("?courseId=" + courseId);
        expect(destination.state.attempt).toEqual(attempt);
        expect(loadCourseAttempt(courseId, "other@example.com")).toBeNull();
    });
    it("offers a real login action when the experiment session expires", () => {
        mocks.experiment.error = new ApiError("Unauthorized", 401);
        mount();
        fireEvent.click(screen.getByRole("button", { name: "重新登入" }));
        expect(mocks.login).toHaveBeenCalledWith("google");
    });
});
