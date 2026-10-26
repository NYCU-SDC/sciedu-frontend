import type { MaterialContext } from "./materialChat";
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
it("uses only existing API fields and the material preset, then decodes history for display", async () => {
    const { ARGUMENTATION_CODE, ARGUMENTATION_PRESET, encodeMaterialMessage } =
        await import("./materialChat");
    const context: MaterialContext = {
        version: 1 as const,
        preset: ARGUMENTATION_PRESET,
        snapshot: {
            capturedAt: "now",
            course: { id: "c", code: ARGUMENTATION_CODE, title: "教材" },
            experimentId: "e",
            page: {
                id: "p",
                title: "頁面",
                stage: "argumentation",
                body: "正文",
                descriptions: ["HIDDEN DESCRIPTION"],
            },
            questions: [],
        },
    };
    const content = encodeMaterialMessage("學生問題", context);
    vi.stubEnv("VITE_CHAT_PRESET", "wrong-global-preset");
    vi.mocked(api).mockResolvedValue({
        message: { ...message, content },
        replyMessageID: "reply",
    });
    const result = await createMessage("chat", content, "parent");
    expect(JSON.parse(vi.mocked(api).mock.calls[0][1]?.body as string)).toEqual(
        { content, previousID: "parent", preset: ARGUMENTATION_PRESET }
    );
    expect(result.message.content).toBe("學生問題");
    expect(result.message.materialContext).toEqual(context);
    vi.mocked(api).mockResolvedValue({
        id: "chat",
        title: content,
        messages: [{ ...message, content }],
    });
    const history = await getChat("chat");
    expect(history.title).toBe("學生問題");
    expect(history.messages[0].content).toBe("學生問題");
});
it("does not retry a rejected material preset with a default role", async () => {
    vi.mocked(api).mockRejectedValue(new Error("preset not found"));
    await expect(
        createMessage(
            "chat",
            "message",
            undefined,
            "augmentation_teacher_and_peer"
        )
    ).rejects.toThrow("preset not found");
    expect(api).toHaveBeenCalledTimes(1);
});
