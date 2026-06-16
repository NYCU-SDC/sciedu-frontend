import type { UseMutationResult } from "@tanstack/react-query";

export type AuthProviderName = "google";

export type AccessTokenPayload = {
    ID?: string;
    FullName?: string;
    Email?: string;
    Role?: string;
    iss?: string;
    sub?: string;
    exp: number;
    nbf?: number;
    iat?: number;
    jti?: string;
};

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
    expirationTime: number;
};

export type AuthContextValue = {
    accessToken?: string;
    refreshToken?: string;
    isAuthenticated: boolean;
    login: (provider: AuthProviderName) => void;
    logout: () => void;
    isLoggedIn: () => boolean;
    setAuthTokens: (tokens: AuthTokens) => void;
    refresh: () => void;
    refreshMutation: UseMutationResult<AuthTokens, Error, void>;
};
