// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { useCourseChatController } from "./useCourseChatController";
import {
    readCourseChat,
    saveCourseChat,
    type CourseChatScope,
} from "../../../../shared/auth/courseChatStorage";
import { ApiError } from "../../../../shared/utils/api";
import {
    createChat,
    createMessage,
    getChat,
} from "../../../../shared/network/chat";
vi.mock("../../../../shared/network/chat", () => ({
    createChat: vi.fn(),
    createMessage: vi.fn(),
    getChat: vi.fn(),
    openStream: vi.fn(() => () => {}),
    CHAT_HISTORY_QUERY_KEY: ["history"],
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const id = "a3000000-0000-4000-8000-000000000001";
const scope: CourseChatScope = {
    account: "a@example.test",
    experimentId: "exp",
    courseId: "course",
    pageId: "page",
};
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.mocked(getChat).mockResolvedValue({
        id,
        title: "saved",
        createdAt: "now",
        updatedAt: "now",
        messages: [],
    });
    vi.mocked(createChat).mockResolvedValue({ chatID: id });
    vi.mocked(createMessage).mockResolvedValue({
        message: {
            id: "u",
            content: "test",
            role: "user",
            status: "completed",
            createdAt: "now",
        },
        replyMessageID: "r",
    });
});
afterEach(() => {
    cleanup();
    client.clear();
});
it("fresh mount validates a saved chat without creating another one", async () => {
    saveCourseChat(scope, id);
    const { result } = renderHook(
        () => useCourseChatController(scope, "教材 · 頁面"),
        { wrapper }
    );
    await waitFor(() => expect(getChat).toHaveBeenCalledWith(id));
    expect(createChat).not.toHaveBeenCalled();
    expect(result.current.title).toBe("教材 · 頁面");
});
it("401 and temporary failures retain the reference; 404 removes it", async () => {
    for (const status of [401, 503, 404]) {
        saveCourseChat(scope, id);
        vi.mocked(getChat).mockRejectedValue(new ApiError("test", status));
        const { result, unmount } = renderHook(
            () => useCourseChatController(scope),
            { wrapper }
        );
        await waitFor(
            () => expect(result.current.errorMessage).not.toBeNull(),
            { timeout: 3000 }
        );
        if (status === 404)
            await waitFor(() => expect(readCourseChat(scope)).toBeNull());
        else expect(readCourseChat(scope)).toBe(id);
        unmount();
        client.clear();
        vi.clearAllMocks();
    }
});
it("first-message response loss preserves the already created chat and draft", async () => {
    vi.mocked(createMessage).mockRejectedValue(new TypeError("response lost"));
    const { result } = renderHook(() => useCourseChatController(scope), {
        wrapper,
    });
    await act(() => result.current.handleSend("question"));
    expect(readCourseChat(scope)).toBe(id);
    expect(result.current.draft).toBe("question");
    await waitFor(() => expect(getChat).toHaveBeenCalledWith(id));
    expect(createChat).toHaveBeenCalledTimes(1);
});
it("same-tick duplicate sends cannot create two chats", async () => {
    const { result } = renderHook(() => useCourseChatController(scope), {
        wrapper,
    });
    await act(() =>
        Promise.all([
            result.current.handleSend("question"),
            result.current.handleSend("question"),
        ])
    );
    expect(createChat).toHaveBeenCalledTimes(1);
    expect(createMessage).toHaveBeenCalledTimes(1);
});
it("restart removes the page reference and does not delete history", async () => {
    saveCourseChat(scope, id);
    const { result } = renderHook(() => useCourseChatController(scope), {
        wrapper,
    });
    await waitFor(() => expect(getChat).toHaveBeenCalled());
    act(() => result.current.handleRefresh());
    expect(readCourseChat(scope)).toBeNull();
    expect(createChat).not.toHaveBeenCalled();
});
it("context load failure preserves text and never creates a chat or sends partial data", async () => {
    const prepare = vi
        .fn()
        .mockRejectedValue(new Error("missing descriptions"));
    const { result } = renderHook(
        () => useCourseChatController(scope, "教材", true, prepare),
        { wrapper }
    );
    await act(() => result.current.handleSend("my question"));
    expect(result.current.draft).toBe("my question");
    expect(result.current.errorMessage).toBe("missing descriptions");
    expect(createChat).not.toHaveBeenCalled();
    expect(createMessage).not.toHaveBeenCalled();
});
it("sends the prepared snapshot for the initial message", async () => {
    const prepare = vi.fn().mockResolvedValue("wire snapshot");
    const { result } = renderHook(
        () => useCourseChatController(scope, "教材", true, prepare),
        { wrapper }
    );
    await act(() => result.current.handleSend("my question"));
    expect(prepare).toHaveBeenCalledWith("my question");
    expect(createMessage).toHaveBeenCalledWith(id, "wire snapshot");
});
