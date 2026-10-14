import type { GetChatResponse, Message, MessagePart } from "../types/chat";
import type { ChatEvent } from "../types/sse";
import type { OpenStreamHandlers } from "../../../shared/network/chatStream";
import { initialSnapshot, reduceEvent } from "./agentStream";
const KEY = "sciedu-chat-mock-v1";
const read = (): GetChatResponse[] => {
    try {
        return JSON.parse(
            sessionStorage.getItem(KEY) ?? "[]"
        ) as GetChatResponse[];
    } catch {
        return [];
    }
};
const save = (chats: GetChatResponse[]) =>
    sessionStorage.setItem(KEY, JSON.stringify(chats));
export async function createMockChat() {
    const now = new Date().toISOString();
    const chat: GetChatResponse = {
        id: crypto.randomUUID(),
        title: "",
        createdAt: now,
        updatedAt: now,
        messages: [],
    };
    save([chat, ...read()]);
    return { chatID: chat.id };
}
export async function getMockChat(id: string) {
    const chat = read().find((c) => c.id === id);
    if (!chat) throw new Error("找不到模擬對話");
    return chat;
}
export async function listMockChats(page = 1, pageSize = 20) {
    const chats = read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
        items: chats
            .slice((page - 1) * pageSize, page * pageSize)
            .map(({ messages: _messages, ...chat }) => chat),
        totalPages: Math.ceil(chats.length / pageSize),
        totalItems: chats.length,
        currentPage: page,
        pageSize,
        hasNextPage: page * pageSize < chats.length,
    };
}
export async function deleteMockChat(id: string) {
    save(read().filter((c) => c.id !== id));
}
export async function createMockMessage(
    id: string,
    content: string,
    previousID?: string
) {
    const chats = read();
    const chat = chats.find((c) => c.id === id);
    if (!chat) throw new Error("找不到模擬對話");
    const now = new Date().toISOString();
    const message: Message = {
        id: crypto.randomUUID(),
        content,
        previousID,
        role: "user",
        status: "completed",
        createdAt: now,
    };
    const reply: Message = {
        id: crypto.randomUUID(),
        content: "",
        previousID: message.id,
        role: "assistant",
        status: "streaming",
        createdAt: now,
    };
    chat.messages.push(message, reply);
    chat.updatedAt = now;
    chat.title ||= content.slice(0, 40);
    save(chats);
    return { message, replyMessageID: reply.id };
}
export function mockEvents(messageID: string): ChatEvent[] {
    const part = (id: string, agent: string, text: string): MessagePart => ({
        id: `${messageID}-${id}`,
        type: "text",
        agent,
        agentRunID: id,
        text,
    });
    const parts: MessagePart[] = [
        {
            id: `${messageID}-private`,
            type: "reasoning",
            agent: "teacher",
            internal: true,
            text: "MOCK_INTERNAL_NEVER_VISIBLE",
        },
        {
            id: `${messageID}-tool`,
            type: "tool_call",
            agent: "teacher",
            name: "search_materials",
            arguments: { private: "MOCK_TOOL_JSON" },
        },
        part(
            "teacher-1",
            "teacher",
            "我們先從教材中的概念出發。**基因**是遺傳訊息的一部分，不同的等位基因可能影響性狀。\n\n例如，若雙親皆為 $Aa$，子代基因型的比例為：\n\n| 基因型 | 機率 |\n| --- | --- |\n| AA | 1/4 |\n| Aa | 1/2 |\n| aa | 1/4 |"
        ),
        part(
            "peer-1",
            "peer",
            "我想確認一下：帶有隱性等位基因，是否就一定會表現隱性性狀？"
        ),
        part(
            "teacher-2",
            "teacher",
            "不一定。在完全顯性的例子中，$Aa$ 會表現顯性性狀，而 $aa$ 才會表現隱性性狀。你能用自己的話說明兩者的差別嗎？"
        ),
    ];
    const events: ChatEvent[] = [
        {
            type: "cast",
            characters: [
                { id: "teacher", displayName: "科學老師", role: "引導學習" },
                { id: "peer", displayName: "學習夥伴", role: "一起探索" },
            ],
        },
    ];
    parts.forEach((p, index) => {
        events.push(
            { type: "agent_start", agent: p.agent },
            { type: "part_start", index, part: { ...p, text: "" } }
        );
        if (p.text)
            for (const delta of p.text.match(/.{1,10}|\n/g) ?? [])
                events.push({ type: "delta", index, delta });
        events.push(
            { type: "part_end", index, part: p },
            { type: "agent_end", agent: p.agent }
        );
    });
    events.push({ type: "done", status: "completed", finishReason: "stop" });
    return events;
}
export function openMockStream(id: string, handlers: OpenStreamHandlers) {
    const chat = read().find((c) => c.messages.some((m) => m.id === id));
    const message = chat?.messages.find((m) => m.id === id);
    if (!message || !chat) {
        queueMicrotask(() => handlers.onEnded(new Error("找不到模擬回覆")));
        return () => undefined;
    }
    const prompt =
        chat.messages.find((m) => m.id === message.previousID)?.content ?? "";
    let events = mockEvents(id);
    if (message.status === "completed")
        events = [
            { type: "cast", characters: message.characters ?? [] },
            ...(message.parts ?? []).flatMap((part, index): ChatEvent[] => [
                { type: "part_start", index, part: { ...part, text: "" } },
                { type: "part_end", index, part },
            ]),
            { type: "done", status: "completed" },
        ];
    const attemptKey = `${KEY}-attempt-${id}`;
    const first = !sessionStorage.getItem(attemptKey);
    sessionStorage.setItem(attemptKey, "1");
    if (prompt.includes("[error]"))
        events = [
            ...events.slice(0, 18),
            { type: "error", error: "Mock failure", code: "mock_error" },
        ];
    const drop = prompt.includes("[disconnect]") && first;
    let index = 0;
    let snapshot = initialSnapshot();
    const timer = window.setInterval(
        () => {
            if (drop && index === 20) {
                clearInterval(timer);
                handlers.onEnded(new Error("模擬連線中斷，請重新載入結果。"));
                return;
            }
            const event = events[index++];
            if (!event) {
                clearInterval(timer);
                return;
            }
            snapshot = reduceEvent(snapshot, event);
            if (snapshot.phase !== "streaming") {
                const chats = read();
                const target = chats
                    .find((c) => c.id === chat.id)
                    ?.messages.find((m) => m.id === id);
                if (target) {
                    Object.assign(target, {
                        content: snapshot.content,
                        parts: snapshot.parts,
                        characters: snapshot.characters,
                        status:
                            snapshot.phase === "done" ? "completed" : "failed",
                        agentRuns: [
                            { id: "teacher-1", agent: "teacher" },
                            {
                                id: "peer-1",
                                agent: "peer",
                                parentRunID: "teacher-1",
                            },
                            { id: "teacher-2", agent: "teacher" },
                        ],
                    });
                    save(chats);
                }
                clearInterval(timer);
            }
            handlers.onEvent(event);
        },
        message.status === "completed" ? 20 : 60
    );
    return () => clearInterval(timer);
}
