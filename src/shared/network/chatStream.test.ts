import { describe, expect, it, vi } from "vitest";
import { readChatStream, openRealStream } from "./chatStream";
function response(text: string) {
    const bytes = new TextEncoder().encode(text);
    return new Response(
        new ReadableStream({
            start(controller) {
                for (const byte of bytes)
                    controller.enqueue(new Uint8Array([byte]));
                controller.close();
            },
        }),
        { headers: { "Content-Type": "text/event-stream" } }
    );
}
describe("SSE reader", () => {
    it("decodes split UTF-8, CRLF, comments and multiline data", async () => {
        const events: unknown[] = [];
        await readChatStream(
            response(
                ': heartbeat\r\ndata: {"delta": "科學",\r\ndata: "isFinished": false}\r\n\r\ndata: {"type":"done"}\r\n\r\n'
            ),
            (event) => events.push(event),
            new AbortController().signal
        );
        expect(events).toEqual([
            { delta: "科學", isFinished: false },
            { type: "done" },
        ]);
    });
    it("rejects EOF without a terminal event, wrong MIME, invalid frames, and auth failures", async () => {
        const signal = new AbortController().signal;
        await expect(
            readChatStream(
                response('data: {"delta":"partial","isFinished":false}\n\n'),
                vi.fn(),
                signal
            )
        ).rejects.toThrow("連線中斷");
        await expect(
            readChatStream(new Response("html"), vi.fn(), signal)
        ).rejects.toThrow("串流");
        await expect(
            readChatStream(response("data: invalid\n\n"), vi.fn(), signal)
        ).rejects.toThrow();
        await expect(
            readChatStream(new Response(null, { status: 401 }), vi.fn(), signal)
        ).rejects.toThrow("登入");
    });
    it("does not emit frames following an error terminal", async () => {
        const handler = vi.fn();
        await readChatStream(
            response(
                'data: {"type":"error","error":"x","code":"x"}\n\ndata: {"type":"done"}\n\n'
            ),
            handler,
            new AbortController().signal
        );
        expect(handler).toHaveBeenCalledTimes(1);
    });
    it("includes cookies and aborts fetch on unsubscribe without failure callbacks", async () => {
        const fetcher = vi.fn(
            (_url: unknown, options: RequestInit) =>
                new Promise<Response>((_resolve, reject) =>
                    options.signal?.addEventListener("abort", () =>
                        reject(new Error("abort"))
                    )
                )
        );
        vi.stubGlobal("fetch", fetcher);
        const handlers = { onEvent: vi.fn(), onEnded: vi.fn() };
        const close = openRealStream("reply", handlers);
        close();
        await Promise.resolve();
        await Promise.resolve();
        expect(fetcher.mock.calls[0][1].credentials).toBe("include");
        expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);
        expect(handlers.onEnded).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });
});
