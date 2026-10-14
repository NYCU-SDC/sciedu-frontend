// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockChat,
    createMockMessage,
    getMockChat,
    listMockChats,
    deleteMockChat,
    openMockStream,
} from "./mockChat";
import type { ChatEvent } from "../types/sse";
beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
describe("mock contract", () => {
    it("persists completed history, supports branching, pagination and deletion", async () => {
        const { chatID } = await createMockChat();
        const first = await createMockMessage(chatID, "test");
        const events: ChatEvent[] = [];
        openMockStream(first.replyMessageID, {
            onEvent: (event) => events.push(event),
            onEnded: vi.fn(),
        });
        vi.runAllTimers();
        const restored = await getMockChat(chatID);
        expect(restored.messages[1]).toMatchObject({
            status: "completed",
            characters: expect.any(Array),
            agentRuns: expect.any(Array),
            parts: expect.any(Array),
        });
        expect(events.at(-1)).toMatchObject({ type: "done" });
        const branch = await createMockMessage(chatID, "edited", undefined);
        expect(branch.message.previousID).toBeUndefined();
        expect((await getMockChat(chatID)).messages).toHaveLength(4);
        expect((await listMockChats()).totalItems).toBe(1);
        await deleteMockChat(chatID);
        expect((await listMockChats()).totalItems).toBe(0);
    });
    it("recovers dropped streams by replaying without creating extra messages", async () => {
        const { chatID } = await createMockChat();
        const { replyMessageID } = await createMockMessage(
            chatID,
            "[disconnect]"
        );
        const failed = vi.fn();
        openMockStream(replyMessageID, { onEvent: vi.fn(), onEnded: failed });
        vi.runAllTimers();
        expect(failed).toHaveBeenCalledOnce();
        const done = vi.fn();
        openMockStream(replyMessageID, { onEvent: done, onEnded: failed });
        vi.runAllTimers();
        expect(done).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: "done" })
        );
        expect((await getMockChat(chatID)).messages).toHaveLength(2);
    });
    it("cancels subscription and replays completed parts without deltas", async () => {
        const { chatID } = await createMockChat();
        const { replyMessageID } = await createMockMessage(chatID, "test");
        const callback = vi.fn();
        const cancel = openMockStream(replyMessageID, {
            onEvent: callback,
            onEnded: vi.fn(),
        });
        cancel();
        vi.runAllTimers();
        expect(callback).not.toHaveBeenCalled();
        openMockStream(replyMessageID, { onEvent: callback, onEnded: vi.fn() });
        vi.runAllTimers();
        callback.mockClear();
        openMockStream(replyMessageID, { onEvent: callback, onEnded: vi.fn() });
        vi.runAllTimers();
        expect(
            callback.mock.calls.some(([event]) => event.type === "delta")
        ).toBe(false);
    });
});
