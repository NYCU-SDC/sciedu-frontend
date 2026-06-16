import type { AccessTokenPayload } from "./types";

export function decodeAccessToken(token: string): AccessTokenPayload {
    const [, payload] = token.split(".");

    if (!payload) {
        throw new Error("Invalid access token");
    }

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
        Math.ceil(normalizedPayload.length / 4) * 4,
        "="
    );

    return JSON.parse(window.atob(paddedPayload)) as AccessTokenPayload;
}

export function getAccessTokenExpiration(token: string): Date {
    return new Date(decodeAccessToken(token).exp * 1000);
}

export function normalizeExpirationTime(expirationTime: number): Date {
    const milliseconds =
        expirationTime < 1_000_000_000_000
            ? expirationTime * 1000
            : expirationTime;

    return new Date(milliseconds);
}
