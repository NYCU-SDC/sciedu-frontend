const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

export type ApiRequestOptions = RequestInit & {
    skipAuthRefresh?: boolean;
};

type AuthApiHandlers = {
    refreshSession: () => Promise<void>;
    onUnauthorized: () => void;
};

let authHandlers: AuthApiHandlers | null = null;
let inflightAuthRefresh: Promise<void> | null = null;

export class ApiError extends Error {
    readonly status: number;
    readonly data: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.data = data;
    }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
    return (
        error instanceof ApiError &&
        (status === undefined || error.status === status)
    );
}

export function configureAuthApiHandlers(handlers: AuthApiHandlers | null) {
    authHandlers = handlers;
}

async function refreshForApiRequest() {
    if (!authHandlers) {
        throw new ApiError("Auth refresh handler is not configured", 401);
    }

    if (!inflightAuthRefresh) {
        inflightAuthRefresh = authHandlers.refreshSession().finally(() => {
            inflightAuthRefresh = null;
        });
    }

    return inflightAuthRefresh;
}

export async function refreshAuthForStreamingRequest() {
    await refreshForApiRequest();
}

export function notifyAuthUnauthorized() {
    authHandlers?.onUnauthorized();
}

async function readJsonSafely(res: Response): Promise<unknown> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

async function createApiError(res: Response) {
    const data = await readJsonSafely(res);
    let errorMessage = `API Error (${res.status})`;

    if (data && typeof data === "object") {
        const problem = data as Record<string, unknown>;

        if (typeof problem.detail === "string") {
            errorMessage = problem.detail;
        } else if (typeof problem.title === "string") {
            errorMessage = problem.title;
        }
    }

    return new ApiError(errorMessage, res.status, data);
}

function buildHeaders(options: ApiRequestOptions) {
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    return headers;
}

async function request<T>(
    path: string,
    options: ApiRequestOptions,
    hasRetriedAuth: boolean
): Promise<T> {
    const { skipAuthRefresh, ...fetchOptions } = options;
    const res = await fetch(`${BASE_URL}${path}`, {
        ...fetchOptions,
        credentials: "include",
        headers: buildHeaders(options),
    });

    if (res.status === 401 && !skipAuthRefresh && !hasRetriedAuth) {
        await refreshForApiRequest();
        return request(path, options, true);
    }

    if (!res.ok) {
        if (res.status === 401 && !skipAuthRefresh) {
            authHandlers?.onUnauthorized();
        }

        throw await createApiError(res);
    }

    if (res.status === 204) {
        return { message: "success" } as T;
    }

    return res.json() as Promise<T>;
}

export async function api<T>(
    path: string,
    options: ApiRequestOptions = {}
): Promise<T> {
    return request<T>(path, options, false);
}
