const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL;

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
        let errorMessage = "";
        try {
            const parsedError = await res.json();
            errorMessage = parsedError.detail || errorMessage;
        } catch {
            errorMessage = `API Error (${res.status})`;
        }
        throw new Error(errorMessage);
    }

    // 204 means no content, so it will cause error when return res.json()
    if (res.status === 204) {
        return { message: "success" } as T;
    }

    return res.json();
}
