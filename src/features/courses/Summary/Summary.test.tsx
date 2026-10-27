// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {
    QueryClient,
    QueryClientProvider,
    focusManager,
} from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Summary from "./Summary";
import { getAttemptSessionId } from "../../../shared/auth/courseAttemptStorage";
import { saveCourseAttempt } from "../genetics/services/courseAttempt";
import { practiceRoundKey } from "../../experience/practiceRound";
const mock = vi.hoisted(() => ({ result: vi.fn(), practice: false }));
vi.mock("../../../shared/auth", () => ({
    useAuth: () => ({ session: { email: "student@example.test" } }),
}));
vi.mock("../genetics/services/useAttemptExperiment", () => ({
    useAttemptExperiment: () => ({
        data: {
            experiment: {
                id: "exp",
                description: mock.practice
                    ? "<!-- sciedu-experience:v1:practice -->"
                    : "",
            },
        },
        isPending: false,
        isError: false,
    }),
}));
vi.mock("../genetics/services/fetchAnswerResult", () => ({
    fetchAnswerResult: mock.result,
}));
let client: QueryClient;
beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mock.practice = false;
    mock.result.mockReset();
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    });
});
afterEach(() => {
    cleanup();
    client.clear();
    focusManager.setFocused(undefined);
});
function mount(practice = false) {
    mock.practice = practice;
    if (practice)
        localStorage.setItem(
            practiceRoundKey("student@example.test", "exp", "course"),
            "round"
        );
    saveCourseAttempt({
        courseId: "course",
        courseTitle: "本機測試教材",
        userEmail: "student@example.test",
        experimentId: "exp",
        sessionId: getAttemptSessionId(),
        startedAt: "2026-10-27T00:00:00Z",
        completedAt: "2026-10-27T00:01:00Z",
        answersByPage: { 0: { q: "答案" } },
        practice,
        roundId: practice ? "round" : undefined,
        submissions: practice
            ? []
            : [
                  {
                      id: "a",
                      questionId: "q",
                      userId: "u",
                      experimentId: "exp",
                      createdAt: "now",
                      textAnswer: "答案",
                  },
              ],
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <MantineProvider>
            <QueryClientProvider client={client}>
                <MemoryRouter
                    initialEntries={["/courses/summary?courseId=course"]}
                >
                    <Summary />
                </MemoryRouter>
            </QueryClientProvider>
        </MantineProvider>
    );
}
it("keeps pending results visible during manual refresh and does not refetch on focus", async () => {
    mock.result.mockResolvedValueOnce({
        status: "PENDING",
        resultVisible: false,
    });
    let finish!: (value: unknown) => void;
    mock.result.mockImplementationOnce(
        () =>
            new Promise((resolve) => {
                finish = resolve;
            })
    );
    mount();
    await screen.findByText("待批改");
    expect(screen.getAllByText("尚無評分")).toHaveLength(2);
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    fireEvent.click(screen.getByRole("button", { name: "重新載入評分" }));
    await waitFor(() => expect(mock.result).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("正在取得正式評分結果…")).toBeNull();
    expect(screen.getByText("待批改")).toBeTruthy();
    expect(screen.getAllByText("尚無評分")).toHaveLength(2);
    finish({ status: "FAILED", resultVisible: false });
    await screen.findByText("評分失敗");
    expect(screen.queryByText("答錯 1 題")).toBeNull();
});
it("practice completion never queries formal scores and provides separate review/restart entries", async () => {
    mount(true);
    await screen.findByText("本輪練習已完成");
    expect(mock.result).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "重新練習" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "查看本輪答案" })).toBeTruthy();
    expect(screen.queryByText("答錯")).toBeNull();
});
