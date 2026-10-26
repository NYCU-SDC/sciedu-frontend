// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CoursePlayer from "./CoursePlayer";
import { parsePresentation } from "./presentation";
import type { CourseDefinition } from "../genetics/types/types";
import manifest from "../../../../tools/argumentation/manifest.json";
const mocks = vi.hoisted(() => ({
    chat: vi.fn(),
    fail: false,
    submits: vi.fn(),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("../../../shared/hooks", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("../genetics/components/useCourseChatController", () => ({
    useCourseChatController: (
        scope: unknown,
        title: string,
        active: boolean
    ) => {
        mocks.chat(scope, title, active);
        return {};
    },
}));
vi.mock("../genetics/components/CourseChat", () => ({
    default: () => <div>既有討論區</div>,
}));
vi.mock("./Simulation", () => ({
    default: ({
        state,
        onChange,
    }: {
        state: { led: boolean; partition: boolean };
        onChange: (s: { led: boolean; partition: boolean }) => void;
    }) => (
        <button onClick={() => onChange({ led: false, partition: true })}>
            模擬設定 {JSON.stringify(state)}
        </button>
    ),
}));
vi.mock("../../../shared/utils/api", () => ({
    ApiError: class ApiError extends Error {},
    api: async (path: string) => {
        const q = path.match(/\/api\/questions\/q(\d)/);
        if (q)
            return {
                id: "q" + q[1],
                type: "TEXT",
                content: manifest.pages[Number(q[1])].questions[0].prompt,
                options: [],
            };
        return { content: path.includes("description") ? "教材正文" : "回答" };
    },
}));
vi.mock("../genetics/services/submitAnswer", () => ({
    submitAnswer: async (id: string, type: string, answer: string) => {
        mocks.submits(id, type, answer);
        if (mocks.fail) throw Error("測試失敗");
        return {
            id: "a" + id,
            questionId: id,
            textAnswer: answer,
            userId: "u",
            experimentId: "e",
            createdAt: "now",
        };
    },
}));
const definition: CourseDefinition = {
    id: "c",
    code: manifest.code,
    title: manifest.title,
    navigation: { variant: "stepper", mainTitle: "科學論證" },
    pages: manifest.pages.map((p, i) => ({
        pageId: "p" + i,
        pageIndex: i,
        secondaryTitle: p.title,
        activeNavbarTitles: [i],
        request: {
            type: "material",
            presentation: parsePresentation(JSON.stringify(p.presentation), i),
            content: {
                imageIds: i < 2 ? ["image"] : [],
                descriptionId: "description" + i,
            },
            questionSections: p.questions.map(() => ({
                titleId: "title" + i,
                questionId: "q" + i,
                required: true,
            })),
        },
    })),
};
let client: QueryClient;
beforeEach(() => {
    sessionStorage.clear();
    mocks.chat.mockClear();
    mocks.submits.mockClear();
    mocks.fail = false;
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    });
});
afterEach(() => {
    cleanup();
    client?.clear();
});
function mount(account = "student", experimentId = "exp") {
    client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const done = vi.fn();
    const result = render(
        <MantineProvider>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <CoursePlayer
                        definition={definition}
                        chatScope={{ account, experimentId, courseId: "c" }}
                        onComplete={done}
                    />
                </MemoryRouter>
            </QueryClientProvider>
        </MantineProvider>
    );
    return { ...result, done };
}
it("requires two successful submissions, recalls the initial answer, skips chat gates and restores simulation state", async () => {
    const view = mount();
    await screen.findByText(manifest.pages[0].questions[0].prompt);
    expect(mocks.chat).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "送出並前往下一頁" }));
    expect(await screen.findByText("此題為必填")).toBeTruthy();
    expect(mocks.submits).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "初始回答測試" },
    });
    mocks.fail = true;
    fireEvent.click(screen.getByRole("button", { name: "送出並前往下一頁" }));
    await screen.findByText(/答案送出失敗/);
    expect(screen.queryByText("學生之前的回答")).toBeNull();
    mocks.fail = false;
    fireEvent.click(screen.getByRole("button", { name: "重試送出" }));
    await screen.findByRole("heading", { name: "學生之前的回答" });
    expect(
        screen.getByRole("region", { name: "學生之前的回答" }).textContent
    ).toContain("初始回答測試");
    fireEvent.click(screen.getByRole("button", { name: "前往下一頁" }));
    await screen.findByRole("button", { name: /模擬設定/ });
    fireEvent.click(screen.getByRole("button", { name: /模擬設定/ }));
    fireEvent.click(screen.getByRole("button", { name: "前往下一頁" }));
    await screen.findByRole("button", { name: /模擬設定.*false/ });
    expect(
        document.querySelector('section[aria-hidden="false"]')?.textContent
    ).not.toContain("既有討論區");
    expect(
        mocks.chat.mock.calls
            .filter((c) => c[2])
            .every((c) => /02|03/.test(c[1]))
    ).toBe(true);
    fireEvent.change(await screen.findByRole("textbox"), {
        target: { value: "最終回答測試" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送出並前往下一頁" }));
    await waitFor(() => expect(view.done).toHaveBeenCalledTimes(1));
    expect(
        view.done.mock.calls[0][0].submissions.map(
            (s: { questionId: string }) => s.questionId
        )
    ).toEqual(["q0", "q3"]);
    expect(mocks.submits.mock.calls.map((c) => c[0])).toEqual([
        "q0",
        "q0",
        "q3",
    ]);
    view.unmount();
    client.clear();
    const resumed = mount();
    await screen.findByRole("button", { name: /模擬設定.*false/ });
    expect(
        ((await screen.findByRole("textbox")) as HTMLTextAreaElement).value
    ).toBe("最終回答測試");
    resumed.unmount();
    client.clear();
    mount("other-student");
    await screen.findByText(manifest.pages[0].questions[0].prompt);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
}, 15000);
