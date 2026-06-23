import { api } from "../utils/api";
import type { SessionResponse } from "./types";

export async function getSession(): Promise<SessionResponse> {
    return api<SessionResponse>("/api/auth/session");
}

export async function refreshAuthToken(): Promise<SessionResponse> {
    return api<SessionResponse>("/api/auth/refresh", { method: "POST" });
}

export async function requestLogout(): Promise<void> {
    await api("/api/auth/logout", { method: "POST" });
}
