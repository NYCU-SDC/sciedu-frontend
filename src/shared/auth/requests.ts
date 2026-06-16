import { api } from "../utils/api";
import type { AuthTokens } from "./types";

export async function refreshAuthToken(
    refreshToken?: string
): Promise<AuthTokens> {
    if (!refreshToken) {
        throw new Error("Cannot refresh auth token without a refresh token");
    }

    return api<AuthTokens>(`/api/refreshToken/${refreshToken}`);
}

export async function requestLogout(): Promise<void> {
    await api("/api/logout");
}
