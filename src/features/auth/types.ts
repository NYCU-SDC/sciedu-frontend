export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

export type OAuthProvider = "google";

export type User = {
    id: string;
    email: string;
    name: string;
    avatarUrl?: string;
    roles: string[];
};

export type AuthSession = {
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
};

export type AuthContextValue = {
    status: AuthStatus;
    user: User | null;
    session: AuthSession | null;
    isLoggedIn: boolean;
    login: (provider: OAuthProvider) => void;
    logout: () => Promise<void>;
    refreshSession: () => Promise<AuthSession>;
};
