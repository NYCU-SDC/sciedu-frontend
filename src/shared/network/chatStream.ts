import type { ChatEvent } from "../../features/chat/types/sse";
import { parseEvent } from "../../features/chat/services/agentStream";
export type OpenStreamHandlers = {
    onEvent: (event: ChatEvent) => void;
    onEnded: (error: Error) => void;
};
/** Decode SSE across arbitrary UTF-8/network boundaries; each frame may have multiple data lines. */
export async function readChatStream(
    response: Response,
    onEvent: OpenStreamHandlers["onEvent"],
    signal: AbortSignal
) {
    if (!response.ok)
        throw new Error(
            response.status === 401
                ? "登入已過期，請重新登入。"
                : `無法接收回覆（HTTP ${response.status}）`
        );
    if (
        !response.headers.get("content-type")?.includes("text/event-stream") ||
        !response.body
    )
        throw new Error("伺服器未回傳聊天串流。");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let data: string[] = [];
    let eventName = "";
    let terminal = false;
    const line = (text: string) => {
        if (!text) {
            if (data.length || eventName === "done") {
                let event: ChatEvent | null;
                try {
                    event = data.length
                        ? parseEvent(JSON.parse(data.join("\n")))
                        : { type: "done" };
                } catch {
                    throw new Error("回覆格式不完整，請重新載入結果。");
                }
                if (event) {
                    onEvent(event);
                    terminal =
                        "type" in event
                            ? event.type === "done" || event.type === "error"
                            : event.isFinished;
                }
            }
            data = [];
            eventName = "";
        } else if (text.startsWith("data:"))
            data.push(text.slice(5).replace(/^ /, ""));
        else if (text.startsWith("event:")) eventName = text.slice(6).trim();
    };
    try {
        while (!signal.aborted && !terminal) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            let match: RegExpExecArray | null;
            while ((match = /\r\n|\r|\n/.exec(buffer))) {
                if (
                    !done &&
                    match[0] === "\r" &&
                    match.index === buffer.length - 1
                )
                    break;
                const text = buffer.slice(0, match.index);
                buffer = buffer.slice(match.index + match[0].length);
                line(text);
                if (terminal || signal.aborted) break;
            }
            if (done) break;
        }
        if (!signal.aborted && !terminal)
            throw new Error("連線中斷，請重新載入結果。");
    } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
export function openRealStream(
    messageID: string,
    handlers: OpenStreamHandlers
): () => void {
    const controller = new AbortController();
    void fetch(
        `${import.meta.env.VITE_BACKEND_BASE_URL ?? ""}/api/chat/stream/${messageID}`,
        {
            credentials: "include",
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
        }
    )
        .then((response) =>
            readChatStream(
                response,
                (event) => {
                    if (!controller.signal.aborted) handlers.onEvent(event);
                },
                controller.signal
            )
        )
        .catch((error: unknown) => {
            if (!controller.signal.aborted)
                handlers.onEnded(
                    error instanceof Error ? error : new Error("連線中斷")
                );
        });
    return () => controller.abort();
}
