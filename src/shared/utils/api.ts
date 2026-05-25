import { parseSSE } from "./sse";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export async function api<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        throw new ApiError(res.status, await readErrorMessage(res));
    }

    // 204 means no content, so it will cause error when return res.json()
    if (res.status === 204) {
        return { message: "success" } as T;
    }

    return res.json();
}

type StreamSSEOptions<T> = {
    onChunk: (chunk: T) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
    headers?: Record<string, string>;
};

export function streamSSE<T>(
    path: string,
    options: StreamSSEOptions<T>
): AbortController {
    const controller = new AbortController();

    void (async () => {
        try {
            const res = await fetch(`${BASE_URL}${path}`, {
                method: "GET",
                signal: controller.signal,
                headers: options.headers,
            });

            if (!res.ok) {
                throw new ApiError(res.status, await readErrorMessage(res));
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response body");

            await parseSSE(reader, (data) => {
                const chunk = JSON.parse(data) as T;
                options.onChunk(chunk);
            });

            options.onComplete?.();
        } catch (e: unknown) {
            if (e instanceof Error && e.name === "AbortError") return;

            const err = e instanceof Error ? e : new Error(String(e));
            options.onError?.(err);
        }
    })();

    return controller;
}

async function readErrorMessage(res: Response): Promise<string> {
    try {
        const parsed = await res.json();
        return parsed.detail || parsed.title || `API Error (${res.status})`;
    } catch {
        return `API Error (${res.status})`;
    }
}
