import { api } from "../utils/api";
import type { SessionResponse } from "./types";

export async function getSession(): Promise<SessionResponse> {
    return api<SessionResponse>("/auth/session");
}

export async function refreshAuthToken(): Promise<SessionResponse> {
    return api<SessionResponse>("/auth/refresh", { method: "POST" });
}

export async function requestLogout(): Promise<void> {
    await api("/auth/logout", { method: "POST" });
}
