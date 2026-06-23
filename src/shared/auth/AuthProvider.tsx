import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";
import { useCookies } from "react-cookie";
import { toast } from "sonner";

import { AuthContext } from "./AuthContext";
import { refreshAuthToken, requestLogout } from "./requests";
import { getAccessTokenExpiration, normalizeExpirationTime } from "./token";
import type { AuthContextValue, AuthProviderName, AuthTokens } from "./types";

const COOKIE_OPTIONS = { path: "/" };
const MAX_TIMEOUT = 2_147_483_647;
const REFRESH_BEFORE_EXPIRATION_MS = 60 * 1000;

type AuthCookies = {
    accessToken?: string;
    refreshToken?: string;
};

type AuthProviderProps = {
    children?: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate();
    const refreshTimerRef = useRef<number | null>(null);
    const [cookies, setCookie, removeCookie] = useCookies<
        "accessToken" | "refreshToken",
        AuthCookies
    >(["accessToken", "refreshToken"]);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            window.clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const setAuthTokens = useCallback(
        (tokens: AuthTokens) => {
            setCookie("accessToken", tokens.accessToken, {
                ...COOKIE_OPTIONS,
                expires: getAccessTokenExpiration(tokens.accessToken),
            });
            setCookie("refreshToken", tokens.refreshToken, {
                ...COOKIE_OPTIONS,
                expires: normalizeExpirationTime(tokens.expirationTime),
            });
        },
        [setCookie]
    );

    const logout = useCallback(() => {
        clearRefreshTimer();
        removeCookie("accessToken", COOKIE_OPTIONS);
        removeCookie("refreshToken", COOKIE_OPTIONS);
        void requestLogout().catch((error: Error) => {
            console.warn(error.message);
        });
        toast.info("Logged out");
        navigate("/login");
    }, [clearRefreshTimer, navigate, removeCookie]);

    const refreshMutation = useMutation<AuthTokens, Error, void>({
        mutationFn: () => refreshAuthToken(cookies.refreshToken),
        onSuccess: setAuthTokens,
        onError: logout,
    });

    // Keep a ref so scheduleRefresh can access the latest mutation without
    // being listed as a dep (useMutation returns a new object every render).
    const refreshMutationRef = useRef(refreshMutation);
    refreshMutationRef.current = refreshMutation;

    const scheduleRefresh = useCallback(() => {
        clearRefreshTimer();

        if (!cookies.refreshToken) {
            return;
        }

        if (!cookies.accessToken) {
            refreshMutationRef.current.mutate();
            return;
        }

        let timeout = 0;

        try {
            timeout = Math.min(
                getAccessTokenExpiration(cookies.accessToken).getTime() -
                    Date.now() -
                    REFRESH_BEFORE_EXPIRATION_MS,
                MAX_TIMEOUT
            );
        } catch {
            refreshMutationRef.current.mutate();
            return;
        }

        refreshTimerRef.current = window.setTimeout(
            () => {
                if (!refreshMutationRef.current.isPending) {
                    refreshMutationRef.current.mutate();
                }
            },
            Math.max(timeout, 0)
        );
    }, [
        clearRefreshTimer,
        cookies.accessToken,
        cookies.refreshToken,
    ]);

    const login = useCallback((provider: AuthProviderName) => {
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        const origin = window.location.origin;
        const callbackUrl = `${origin}/callback/login`;
        const redirectUrl = `${origin}/`;
        const urlMap: Record<AuthProviderName, string> = {
            google: `${baseUrl}/api/login/oauth/google?c=${callbackUrl}&r=${redirectUrl}`,
        };

        window.location.href = urlMap[provider];
    }, []);

    const isLoggedIn = useCallback(
        () => Boolean(cookies.refreshToken),
        [cookies.refreshToken]
    );

    const refresh = useCallback(() => {
        refreshMutationRef.current.mutate();
    }, []);

    useEffect(() => {
        scheduleRefresh();

        return clearRefreshTimer;
    }, [clearRefreshTimer, scheduleRefresh]);

    const value = useMemo<AuthContextValue>(
        () => ({
            accessToken: cookies.accessToken,
            refreshToken: cookies.refreshToken,
            isAuthenticated: Boolean(cookies.refreshToken),
            login,
            logout,
            isLoggedIn,
            setAuthTokens,
            refresh,
            refreshMutation,
        }),
        [
            cookies.accessToken,
            cookies.refreshToken,
            isLoggedIn,
            login,
            logout,
            refresh,
            refreshMutation,
            setAuthTokens,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children ?? <Outlet />}
        </AuthContext.Provider>
    );
}
