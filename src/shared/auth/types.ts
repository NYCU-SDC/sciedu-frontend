export type AuthProviderName = "google";

export type SessionResponse = {
    username: string;
    email: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
};

export type AuthContextValue = {
    session: SessionResponse | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (provider: AuthProviderName) => void;
    logout: () => Promise<void>;
    refresh: () => void;
};
