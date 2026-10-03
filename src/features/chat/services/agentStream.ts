import type { Character, MessagePart } from "../types/chat";
import type { ChatEvent } from "../types/sse";
export type AgentSnapshot = {
    content: string;
    parts?: MessagePart[];
    characters?: Character[];
    activeAgents: string[];
    phase: "streaming" | "done" | "failed";
    error?: string;
};
export const initialSnapshot = (): AgentSnapshot => ({
    content: "",
    activeAgents: [],
    phase: "streaming",
});
export function reduceEvent(
    state: AgentSnapshot,
    event: ChatEvent
): AgentSnapshot {
    if (state.phase !== "streaming") return state;
    if (!("type" in event))
        return {
            ...state,
            content: state.content + event.delta,
            phase: event.isFinished ? "done" : "streaming",
        };
    switch (event.type) {
        case "cast":
            return { ...state, characters: event.characters };
        case "agent_start":
            return {
                ...state,
                activeAgents: [...state.activeAgents, event.agent],
            };
        case "agent_end": {
            const agents = [...state.activeAgents];
            const index = agents.lastIndexOf(event.agent);
            if (index >= 0) agents.splice(index, 1);
            return { ...state, activeAgents: agents };
        }
        case "part_start":
        case "part_end":
        case "delta": {
            const parts = [...(state.parts ?? [])];
            if (event.type === "delta") {
                const part = parts[event.index];
                if (!part)
                    throw new Error("收到尚未開始的訊息片段，請重新載入結果。");
                // Tool deltas are deliberately not displayed. part_end supplies their snapshot.
                if (part.type === "text" || part.type === "reasoning")
                    parts[event.index] = {
                        ...part,
                        text: (part.text ?? "") + event.delta,
                    };
            } else parts[event.index] = { ...event.part };
            return {
                ...state,
                parts,
                content: parts
                    .filter((p) => p && p.type === "text" && !p.internal)
                    .map((p) => p.text ?? "")
                    .join(""),
            };
        }
        case "done":
            return {
                ...state,
                activeAgents: [],
                phase: event.status === "failed" ? "failed" : "done",
                error:
                    event.status === "failed"
                        ? "回覆未完成，請重新載入結果。"
                        : undefined,
            };
        case "error":
            return {
                ...state,
                activeAgents: [],
                phase: "failed",
                error: "回覆中斷，請重新載入結果或重新生成。",
            };
    }
}

// Validate the wire boundary instead of trusting JSON casts.
const object = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;
export function parseEvent(value: unknown): ChatEvent | null {
    if (!object(value)) throw new Error("無效的串流資料");
    if (!("type" in value)) {
        if (
            typeof value.delta === "string" &&
            typeof value.isFinished === "boolean"
        )
            return value as unknown as ChatEvent;
        throw new Error("無效的串流資料");
    }
    const index = () =>
        Number.isInteger(value.index) &&
        Number(value.index) >= 0 &&
        Number(value.index) < 10000;
    let valid: boolean;
    switch (value.type) {
        case "cast":
            valid =
                Array.isArray(value.characters) &&
                value.characters.every(
                    (c) =>
                        object(c) &&
                        typeof c.id === "string" &&
                        typeof c.displayName === "string" &&
                        typeof c.role === "string"
                );
            break;
        case "agent_start":
        case "agent_end":
            valid = typeof value.agent === "string";
            break;
        case "part_start":
        case "part_end":
            valid =
                index() &&
                object(value.part) &&
                typeof value.part.id === "string" &&
                typeof value.part.agent === "string" &&
                ["text", "reasoning", "tool_call", "tool_result"].includes(
                    String(value.part.type)
                ) &&
                (value.part.text === undefined ||
                    typeof value.part.text === "string") &&
                (value.part.internal === undefined ||
                    typeof value.part.internal === "boolean");
            break;
        case "delta":
            valid = index() && typeof value.delta === "string";
            break;
        case "done":
            valid =
                value.status === undefined ||
                ["streaming", "completed", "failed"].includes(
                    String(value.status)
                );
            break;
        case "error":
            valid =
                typeof value.error === "string" &&
                typeof value.code === "string";
            break;
        default:
            return null; // Forward-compatible unrelated events.
    }
    if (!valid) throw new Error("無效的串流事件");
    return value as unknown as ChatEvent;
}
