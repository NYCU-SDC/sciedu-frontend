import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router";
import { toast } from "sonner";

import { AuthContext } from "./AuthContext";
import { getSession, refreshAuthToken, requestLogout } from "./requests";
import type { AuthContextValue, AuthProviderName, SessionResponse } from "./types";

// 2^31 - 1: maximum safe setTimeout delay (browser 32-bit limit)
const MAX_TIMEOUT = 2_147_483_647;
const REFRESH_BEFORE_EXPIRATION_MS = 60 * 1000;

type AuthProviderProps = {
    children?: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const refreshTimerRef = useRef<number | null>(null);

    const sessionQuery = useQuery({
        queryKey: ["auth", "session"],
        queryFn: getSession,
        retry: false,
        staleTime: Infinity,
    });

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            window.clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const logout = useCallback(() => {
        clearRefreshTimer();
        void requestLogout().catch((error: Error) => {
            console.warn(error.message);
        });
        queryClient.removeQueries({ queryKey: ["auth"] });
        toast.info("Logged out");
        navigate("/login");
    }, [clearRefreshTimer, navigate, queryClient]);

    const refreshMutation = useMutation<SessionResponse, Error, void>({
        mutationFn: refreshAuthToken,
        onSuccess: (session) => {
            queryClient.setQueryData(["auth", "session"], session);
        },
        onError: logout,
    });

    // Keep a ref so scheduleRefresh can access the latest mutation without
    // being listed as a dep (useMutation returns a new object every render).
    const refreshMutationRef = useRef(refreshMutation);
    refreshMutationRef.current = refreshMutation;

    const scheduleRefresh = useCallback(
        (session: SessionResponse | undefined) => {
            clearRefreshTimer();

            if (!session) {
                return;
            }

            const timeout = Math.min(
                new Date(session.accessTokenExpiresAt).getTime() -
                    Date.now() -
                    REFRESH_BEFORE_EXPIRATION_MS,
                MAX_TIMEOUT
            );

            refreshTimerRef.current = window.setTimeout(
                () => {
                    if (!refreshMutationRef.current.isPending) {
                        refreshMutationRef.current.mutate();
                    }
                },
                Math.max(timeout, 0)
            );
        },
        [clearRefreshTimer]
    );

    const login = useCallback((provider: AuthProviderName) => {
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        const redirectUrl = `${window.location.origin}/`;
        const urlMap: Record<AuthProviderName, string> = {
            google: `${baseUrl}/login/oauth/google?r=${redirectUrl}`,
        };

        window.location.href = urlMap[provider];
    }, []);

    const refresh = useCallback(() => {
        refreshMutationRef.current.mutate();
    }, []);

    useEffect(() => {
        scheduleRefresh(sessionQuery.data);
        return clearRefreshTimer;
    }, [clearRefreshTimer, scheduleRefresh, sessionQuery.data]);

    const value = useMemo<AuthContextValue>(
        () => ({
            session: sessionQuery.data ?? null,
            isAuthenticated: sessionQuery.isSuccess,
            login,
            logout,
            refresh,
        }),
        [sessionQuery.data, sessionQuery.isSuccess, login, logout, refresh]
    );

    return (
        <AuthContext.Provider value={value}>
            {children ?? <Outlet />}
        </AuthContext.Provider>
    );
}
