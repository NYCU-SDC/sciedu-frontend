// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "./useChat";
import { reconcileChat } from "./useChatMessages";
import {
    getChat,
    createMessage,
    openStream,
} from "../../../shared/network/chat";
import type { GetChatResponse, MessagePart } from "../types/chat";
import type { OpenStreamHandlers } from "../../../shared/network/chatStream";
vi.mock("../../../shared/network/chat", () => ({
    getChat: vi.fn(),
    createMessage: vi.fn(),
    openStream: vi.fn(),
    CHAT_HISTORY_QUERY_KEY: ["history"],
}));
const part: MessagePart = {
    id: "p",
    type: "text",
    agent: "teacher",
    text: "完整回覆",
};
const data = (id = "chat"): GetChatResponse => ({
    id,
    title: "test",
    createdAt: "now",
    updatedAt: "now",
    messages: [
        {
            id: `${id}-user`,
            role: "user",
            content: "問題",
            status: "completed",
            createdAt: "now",
        },
        {
            id: `${id}-reply`,
            role: "assistant",
            content: "",
            previousID: `${id}-user`,
            status: "streaming",
            createdAt: "now",
        },
    ],
});
let handlers: OpenStreamHandlers;
let close = vi.fn<() => void>();
let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    vi.mocked(getChat).mockImplementation(async (id) => data(id));
    close = vi.fn();
    vi.mocked(openStream).mockImplementation((_id, value) => {
        handlers = value;
        return close;
    });
});
afterEach(() => {
    cleanup();
    client.clear();
});
describe("chat lifecycle", () => {
    it("keeps completed typed content when canonical GET still says streaming", async () => {
        const { result } = renderHook(() => useChat("chat"), { wrapper });
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(1));
        act(() => {
            handlers.onEvent({
                type: "cast",
                characters: [
                    { id: "teacher", displayName: "老師", role: "指導" },
                ],
            });
            handlers.onEvent({ type: "part_end", index: 0, part });
            handlers.onEvent({ type: "done" });
        });
        await waitFor(() => expect(result.current.status).toBe("idle"));
        expect(result.current.messages.at(-1)).toMatchObject({
            content: "完整回覆",
            status: "completed",
            parts: [part],
        });
        await waitFor(() => expect(getChat).toHaveBeenCalledTimes(2));
        expect(openStream).toHaveBeenCalledTimes(1);
        expect(
            result.current.messages.at(-1)?.characters?.[0].displayName
        ).toBe("老師");
    });
    it("stops without auto-reconnect and explicitly resumes with a fresh accumulator", async () => {
        const { result } = renderHook(() => useChat("chat"), { wrapper });
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(1));
        act(() => handlers.onEvent({ type: "part_end", index: 0, part }));
        act(() => result.current.abort());
        expect(close).toHaveBeenCalled();
        expect(result.current.recoveryMessage).toContain("停止接收");
        expect(result.current.messages.at(-1)?.content).toBe("完整回覆");
        expect(openStream).toHaveBeenCalledTimes(1);
        act(() => result.current.reloadResult());
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(2));
        act(() => {
            handlers.onEvent({ type: "part_end", index: 0, part });
            handlers.onEvent({ type: "done" });
        });
        expect(result.current.messages.at(-1)?.content).toBe("完整回覆");
    });
    it("keeps partial content on disconnect and does not resend the user message", async () => {
        const { result } = renderHook(() => useChat("chat"), { wrapper });
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(1));
        act(() => {
            handlers.onEvent({ type: "part_end", index: 0, part });
            handlers.onEnded(new Error("斷線"));
        });
        expect(result.current.recoveryMessage).toBe("斷線");
        expect(result.current.messages.at(-1)?.content).toBe("完整回覆");
        expect(createMessage).not.toHaveBeenCalled();
    });
    it("unsubscribes on conversation change and ignores stale callbacks", async () => {
        const { result, rerender } = renderHook(({ id }) => useChat(id), {
            wrapper,
            initialProps: { id: "chat" },
        });
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(1));
        const stale = handlers;
        rerender({ id: "other" });
        await waitFor(() => expect(openStream).toHaveBeenCalledTimes(2));
        act(() => stale.onEvent({ type: "part_end", index: 0, part }));
        expect(close).toHaveBeenCalled();
        expect(result.current.messages.at(-1)?.content).toBe("");
    });
    it("preserves explicit root anchors when editing or regenerating", async () => {
        const completed = data();
        completed.messages[1].status = "completed";
        vi.mocked(getChat).mockResolvedValue(completed);
        vi.mocked(createMessage).mockResolvedValue({
            message: {
                ...completed.messages[0],
                id: "edited",
                content: "修改",
            },
            replyMessageID: "new-reply",
        });
        const { result } = renderHook(() => useChat("chat"), { wrapper });
        await waitFor(() => expect(result.current.messages).toHaveLength(2));
        await act(() => result.current.editAndSend("chat-user", "修改"));
        expect(createMessage).toHaveBeenCalledWith("chat", "修改", undefined);
    });
    it("offers recovery for failed history after a fresh mount", async () => {
        const failed = data();
        failed.messages[1].status = "failed";
        failed.messages[1].parts = [part];
        vi.mocked(getChat).mockResolvedValue(failed);
        const { result } = renderHook(() => useChat("chat"), { wrapper });
        await waitFor(() =>
            expect(result.current.recoveryMessage).toContain("上次回覆未完成")
        );
        expect(openStream).not.toHaveBeenCalled();
        act(() => result.current.reloadResult());
        await waitFor(() =>
            expect(openStream).toHaveBeenCalledWith(
                "chat-reply",
                expect.any(Object)
            )
        );
        expect(createMessage).not.toHaveBeenCalled();
    });
    it("retains cast metadata while accepting a richer canonical history snapshot", () => {
        const old = data();
        old.messages[1].characters = [
            { id: "teacher", displayName: "老師", role: "引導" },
        ];
        const incoming = data();
        incoming.messages[1].status = "completed";
        incoming.messages[1].parts = [part];
        expect(reconcileChat(incoming, old).messages[1]).toMatchObject({
            parts: [part],
            characters: old.messages[1].characters,
            status: "completed",
        });
    });
});
