import { api } from "../../../shared/utils/api";
import type { AuthSession, User } from "../types";

type WrappedUserResponse = {
    user?: unknown;
};

type WrappedSessionResponse = {
    session?: unknown;
};

let inflightRefresh: Promise<AuthSession> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function readString(value: unknown, fieldName: string) {
    if (typeof value !== "string") {
        throw new Error(`Invalid auth response: ${fieldName} must be a string`);
    }

    return value;
}

function readNumber(value: unknown, fieldName: string) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Invalid auth response: ${fieldName} must be a number`);
    }

    return value;
}

function unwrapUserResponse(data: unknown) {
    if (!isRecord(data)) {
        throw new Error("Invalid user response");
    }

    return (data as WrappedUserResponse).user ?? data;
}

function unwrapSessionResponse(data: unknown) {
    if (!isRecord(data)) {
        throw new Error("Invalid session response");
    }

    return (data as WrappedSessionResponse).session ?? data;
}

function normalizeUser(data: unknown): User {
    const user = unwrapUserResponse(data);

    if (!isRecord(user)) {
        throw new Error("Invalid user response");
    }

    const roles = user.roles;

    if (!Array.isArray(roles)) {
        throw new Error("Invalid user response: roles must be an array");
    }

    const avatarUrl = user.avatarUrl;

    return {
        id: readString(user.id, "id"),
        email: readString(user.email, "email"),
        name: readString(user.name, "name"),
        avatarUrl: typeof avatarUrl === "string" ? avatarUrl : undefined,
        roles: roles.map((role) => readString(role, "role")),
    };
}

function normalizeSession(data: unknown): AuthSession {
    const session = unwrapSessionResponse(data);

    if (!isRecord(session)) {
        throw new Error("Invalid auth session response");
    }

    return {
        accessTokenExpiresAt: readNumber(
            session.accessTokenExpiresAt,
            "accessTokenExpiresAt"
        ),
        refreshTokenExpiresAt: readNumber(
            session.refreshTokenExpiresAt,
            "refreshTokenExpiresAt"
        ),
    };
}

export async function fetchCurrentUser(): Promise<User> {
    const data = await api<unknown>("/api/users/me", {
        method: "GET",
        skipAuthRefresh: true,
    });

    return normalizeUser(data);
}

export async function fetchAuthSession(): Promise<AuthSession> {
    const data = await api<unknown>("/api/auth/session", {
        method: "GET",
        skipAuthRefresh: true,
    });

    return normalizeSession(data);
}

async function refreshAuthSessionRequest(): Promise<AuthSession> {
    const data = await api<unknown>("/api/auth/refresh", {
        method: "POST",
        skipAuthRefresh: true,
    });

    return normalizeSession(data);
}

export async function refreshAuthSession(): Promise<AuthSession> {
    if (!inflightRefresh) {
        inflightRefresh = refreshAuthSessionRequest().finally(() => {
            inflightRefresh = null;
        });
    }

    return inflightRefresh;
}

export async function logoutAuthSession(): Promise<void> {
    await api<unknown>("/api/auth/logout", {
        method: "POST",
        skipAuthRefresh: true,
    });
}
