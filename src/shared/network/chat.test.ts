import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { api } from "../utils/api";
import { createMessage, getChat, CHAT_MOCK_ENABLED } from "./chat";
vi.mock("../utils/api", () => ({ api: vi.fn() }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());
const message = {
    id: "user",
    content: "hello",
    role: "user",
    status: "completed",
    createdAt: "now",
    previousID: "00000000-0000-0000-0000-000000000000",
};
it("defaults to real backend, omits unset preset and keeps the distinct reply ID", async () => {
    vi.stubEnv("VITE_CHAT_PRESET", "");
    vi.mocked(api).mockResolvedValue({ message, replyMessageID: "reply" });
    expect(CHAT_MOCK_ENABLED).toBe(false);
    const result = await createMessage("chat", "hello");
    expect(api).toHaveBeenCalledWith("/api/chat/chat", {
        method: "POST",
        body: JSON.stringify({ content: "hello" }),
    });
    expect(result.replyMessageID).toBe("reply");
    expect(result.message.previousID).toBeUndefined();
});
it("sends a configured preset and explicit branch parent, without a model field", async () => {
    vi.stubEnv("VITE_CHAT_PRESET", "teacher-and-peer");
    vi.mocked(api).mockResolvedValue({ message, replyMessageID: "reply" });
    await createMessage("chat", "hello", "parent");
    expect(JSON.parse(vi.mocked(api).mock.calls[0][1]?.body as string)).toEqual(
        { content: "hello", previousID: "parent", preset: "teacher-and-peer" }
    );
});
it("retains canonical structured history and never silently falls back to mock", async () => {
    const structured = {
        ...message,
        parts: [
            {
                id: "p",
                type: "text",
                agent: "teacher",
                agentRunID: "run",
                text: "hello",
            },
        ],
        characters: [{ id: "teacher", displayName: "Teacher", role: "Guide" }],
        agentRuns: [{ id: "run", agent: "teacher" }],
    };
    vi.mocked(api).mockResolvedValue({ id: "chat", messages: [structured] });
    expect((await getChat("chat")).messages[0]).toMatchObject({
        parts: structured.parts,
        characters: structured.characters,
        agentRuns: structured.agentRuns,
    });
    vi.mocked(api).mockRejectedValue(new Error("backend unavailable"));
    await expect(getChat("chat")).rejects.toThrow("backend unavailable");
});
