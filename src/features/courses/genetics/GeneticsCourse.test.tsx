// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import GeneticsCourse from "./GeneticsCourse";
import {
    loadCourseAttempt,
    type CourseAttempt,
} from "./services/courseAttempt";
import {
    clearCourseAttemptStorage,
    getAttemptSessionId,
} from "../../../shared/auth/courseAttemptStorage";
import type { CoursePageRequest, SubmittedAnswerResponse } from "./types/types";

const courseId = "10000000-0000-4000-8000-000000000001";
const fixtures = vi.hoisted(() => ({ experimentId: "e1" }));
vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({
        session: { email: "student@example.com" },
        login: vi.fn(),
    }),
}));
vi.mock("./services/useAttemptExperiment", () => ({
    useAttemptExperiment: () => ({
        data: {
            experiment: {
                id: fixtures.experimentId,
                status: "ACTIVE",
                scheduledStartAt: "2020-01-01T00:00:00Z",
                scheduledEndAt: "2100-01-01T00:00:00Z",
            },
            courses: [
                {
                    id: "10000000-0000-4000-8000-000000000001",
                    status: "PUBLISHED",
                },
            ],
        },
        isSuccess: true,
        isPending: false,
        isError: false,
    }),
}));
vi.mock("./services/fetchCourseDefinition", () => ({
    isCourseUuid: (id: string) => id.includes("-"),
    fetchCourseDefinition: async (id: string) => ({
        id,
        code: "BCI",
        title: "腦機介面",
        navigation: { variant: "stepper", mainTitle: "科學" },
        pages: [0, 1].map((pageIndex) => ({
            pageIndex,
            activeNavbarTitles: [pageIndex],
            secondaryTitle: "頁面" + pageIndex,
            request: {
                type: "material",
                content: { imageIds: [], descriptionId: "d" },
                questionSections: [],
            },
        })),
    }),
}));
vi.mock("../../experience/useLearningLock", () => ({
    useLearningLock: () => ({ acquired: true }),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("../../../shared/hooks", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("./components/Navbar", () => ({ default: () => null }));
vi.mock("./components/useCourseChatController", () => ({
    useCourseChatController: () => ({}),
}));
vi.mock("./services/fetchPageContent", () => ({
    generateRQRequestFromPage: () => [],
}));
vi.mock("./layouts/Material", () => ({
    default: ({
        data,
        answers,
        onAnswersSubmitted,
        onAnswerChange,
        onNext,
        reviewMode,
    }: {
        data: CoursePageRequest;
        answers: Record<string, string>;
        onAnswersSubmitted: (values: SubmittedAnswerResponse[]) => void;
        onAnswerChange: (id: string, value: string) => void;
        onNext: () => void;
        reviewMode: boolean;
    }) => {
        const id = "q" + data.pageIndex;
        return (
            <div>
                <input
                    aria-label={id}
                    value={answers[id] ?? ""}
                    disabled={reviewMode}
                    onChange={(event) => onAnswerChange(id, event.target.value)}
                />
                <button
                    onClick={() => {
                        onAnswersSubmitted([
                            {
                                id: "a" + data.pageIndex,
                                questionId: id,
                                experimentId: fixtures.experimentId,
                                userId: "u1",
                                textAnswer: answers[id],
                                createdAt: "2026-10-12T00:00:00Z",
                            },
                        ]);
                        onNext();
                    }}
                >
                    送出頁面{data.pageIndex}
                </button>
            </div>
        );
    },
}));
function Destination() {
    const location = useLocation();
    return (
        <output data-testid="destination">
            {JSON.stringify(location.state)}
        </output>
    );
}
const clients: QueryClient[] = [];
function mount(review = false, attempt?: CourseAttempt) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    clients.push(client);
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: "/course/" + courseId,
                        search: review ? "?mode=review" : "",
                        state: { attempt },
                    },
                ]}
            >
                <Routes>
                    <Route
                        path="/course/:courseId"
                        element={<GeneticsCourse />}
                    />
                    <Route path="/courses/summary" element={<Destination />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
}
beforeEach(() => {
    clearCourseAttemptStorage();
    fixtures.experimentId = "e1";
});
afterEach(() => {
    cleanup();
    clients.splice(0).forEach((client) => client.clear());
});
describe("shared CoursePlayer integration", () => {
    it("carries the real UUID title and all page answers into Summary", async () => {
        mount();
        fireEvent.change(await screen.findByLabelText("q0"), {
            target: { value: "第一頁答案" },
        });
        fireEvent.click(screen.getByText("送出頁面0"));
        fireEvent.change(await screen.findByLabelText("q1"), {
            target: { value: "最後一頁答案" },
        });
        fireEvent.click(screen.getByText("送出頁面1"));
        const state = JSON.parse(
            (await screen.findByTestId("destination")).textContent!
        );
        expect(state.attempt).toMatchObject({
            courseId,
            courseTitle: "腦機介面",
            experimentId: "e1",
            userEmail: "student@example.com",
            answersByPage: {
                0: { q0: "第一頁答案" },
                1: { q1: "最後一頁答案" },
            },
        });
        expect(state.attempt.submissions).toHaveLength(2);
        expect(
            loadCourseAttempt(courseId, "student@example.com", "e1")
        ).toEqual(state.attempt);
        expect(
            loadCourseAttempt(courseId, "student@example.com", "e2")
        ).toBeNull();
    });
    it("does not unlock pages from the review URL alone", async () => {
        mount(true);
        expect(
            await screen.findByText(
                "找不到目前帳號與實驗的作答紀錄，請從完成後的摘要頁進入"
            )
        ).toBeTruthy();
        expect(screen.queryByLabelText("q0")).toBeNull();
    });
    it("rejects old history state after logout", async () => {
        const attempt: CourseAttempt = {
            courseId,
            courseTitle: "腦機介面",
            experimentId: "e1",
            userEmail: "student@example.com",
            sessionId: getAttemptSessionId(),
            startedAt: "2026-10-12T00:00:00Z",
            completedAt: "2026-10-12T00:10:00Z",
            answersByPage: { 0: { q0: "secret" } },
            submissions: [],
        };
        clearCourseAttemptStorage();
        mount(true, attempt);
        await waitFor(() =>
            expect(
                screen.getByText(
                    "找不到目前帳號與實驗的作答紀錄，請從完成後的摘要頁進入"
                )
            ).toBeTruthy()
        );
        expect(screen.queryByDisplayValue("secret")).toBeNull();
    });
});
