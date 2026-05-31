import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import {
    configureAuthApiHandlers,
    isApiError,
} from "../../../shared/utils/api";
import { AuthContext } from "../context/AuthContext";
import {
    fetchAuthSession,
    fetchCurrentUser,
    logoutAuthSession,
    refreshAuthSession,
} from "../services/authApi";
import type { AuthSession, AuthStatus, OAuthProvider, User } from "../types";
import { getAuthReturnPath, getLocationPath } from "../utils/navigation";

const AUTH_CHANNEL_NAME = "sciedu-auth";
const REFRESH_BUFFER_MS = 60_000;
const MAX_TIMEOUT_MS = 2_147_483_647;
const REFRESH_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000, 120_000];

type AuthBroadcastMessage =
    | {
          type: "refreshed";
          session: AuthSession;
      }
    | {
          type: "logout";
      };

function toAbsoluteUrl(path: string) {
    return new URL(path, window.location.origin).toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState<AuthStatus>("loading");
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);

    const channelRef = useRef<BroadcastChannel | null>(null);
    const locationRef = useRef(location);
    const refreshSessionRef = useRef<() => Promise<AuthSession>>(async () => {
        throw new Error("AuthProvider is not ready to refresh the session");
    });
    const refreshTimerRef = useRef<number | null>(null);
    const retryTimerRef = useRef<number | null>(null);
    const retryAttemptRef = useRef(0);
    const nextRefreshAtRef = useRef<number | null>(null);

    useEffect(() => {
        locationRef.current = location;
    }, [location]);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current !== null) {
            window.clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const clearRetryTimer = useCallback(() => {
        if (retryTimerRef.current !== null) {
            window.clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
    }, []);

    const clearTimers = useCallback(() => {
        clearRefreshTimer();
        clearRetryTimer();
        nextRefreshAtRef.current = null;
    }, [clearRefreshTimer, clearRetryTimer]);

    const scheduleRefresh = useCallback(
        (nextSession: AuthSession) => {
            clearRefreshTimer();

            const nextRefreshAt =
                nextSession.accessTokenExpiresAt * 1000 - REFRESH_BUFFER_MS;
            const delay = Math.min(
                Math.max(nextRefreshAt - Date.now(), 0),
                MAX_TIMEOUT_MS
            );

            nextRefreshAtRef.current = nextRefreshAt;
            refreshTimerRef.current = window.setTimeout(() => {
                refreshTimerRef.current = null;

                if (document.visibilityState === "hidden") {
                    return;
                }

                void refreshSessionRef.current().catch(() => undefined);
            }, delay);
        },
        [clearRefreshTimer]
    );

    const applySession = useCallback(
        (nextSession: AuthSession, shouldBroadcast: boolean) => {
            retryAttemptRef.current = 0;
            clearRetryTimer();
            setSession(nextSession);
            scheduleRefresh(nextSession);

            if (shouldBroadcast) {
                channelRef.current?.postMessage({
                    type: "refreshed",
                    session: nextSession,
                } satisfies AuthBroadcastMessage);
            }
        },
        [clearRetryTimer, scheduleRefresh]
    );

    const applyAuthenticatedState = useCallback(
        (
            nextUser: User,
            nextSession: AuthSession,
            options: { broadcast: boolean }
        ) => {
            setUser(nextUser);
            setStatus("authenticated");
            applySession(nextSession, options.broadcast);
        },
        [applySession]
    );

    const applyAnonymousState = useCallback(() => {
        clearTimers();
        retryAttemptRef.current = 0;
        setUser(null);
        setSession(null);
        setStatus("anonymous");
    }, [clearTimers]);

    const navigateToLogin = useCallback(() => {
        const currentLocation = locationRef.current;

        if (currentLocation.pathname === "/login") {
            return;
        }

        navigate("/login", {
            replace: true,
            state: {
                from: getLocationPath(currentLocation),
            },
        });
    }, [navigate]);

    const expireSession = useCallback(
        (options?: {
            broadcast?: boolean;
            notify?: boolean;
            navigate?: boolean;
        }) => {
            applyAnonymousState();

            if (options?.broadcast ?? true) {
                channelRef.current?.postMessage({
                    type: "logout",
                } satisfies AuthBroadcastMessage);
            }

            if (options?.navigate ?? true) {
                navigateToLogin();
            }

            if (options?.notify ?? true) {
                toast.info("登入狀態已過期，請重新登入");
            }
        },
        [applyAnonymousState, navigateToLogin]
    );

    const scheduleTransientRefreshRetry = useCallback(() => {
        if (retryTimerRef.current !== null) {
            return;
        }

        const delay =
            REFRESH_RETRY_DELAYS_MS[
                Math.min(
                    retryAttemptRef.current,
                    REFRESH_RETRY_DELAYS_MS.length - 1
                )
            ];

        retryAttemptRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;

            if (document.visibilityState === "hidden") {
                return;
            }

            void refreshSessionRef.current().catch(() => undefined);
        }, delay);
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const nextSession = await refreshAuthSession();
            applySession(nextSession, true);
            return nextSession;
        } catch (error) {
            if (isApiError(error, 401)) {
                expireSession();
            } else {
                scheduleTransientRefreshRetry();
            }

            throw error;
        }
    }, [applySession, expireSession, scheduleTransientRefreshRetry]);

    useEffect(() => {
        refreshSessionRef.current = refreshSession;
    }, [refreshSession]);

    useEffect(() => {
        configureAuthApiHandlers({
            refreshSession: async () => {
                await refreshSession();
            },
            onUnauthorized: () => {
                expireSession();
            },
        });

        return () => configureAuthApiHandlers(null);
    }, [expireSession, refreshSession]);

    useEffect(() => {
        if (typeof BroadcastChannel === "undefined") {
            return;
        }

        const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
            if (event.data.type === "refreshed") {
                applySession(event.data.session, false);
                return;
            }

            applyAnonymousState();
            navigateToLogin();
        };

        return () => {
            channel.close();
            channelRef.current = null;
        };
    }, [applyAnonymousState, applySession, navigateToLogin]);

    useEffect(() => {
        let cancelled = false;

        async function bootstrapAuth() {
            setStatus("loading");

            try {
                const [nextUser, nextSession] = await Promise.all([
                    fetchCurrentUser(),
                    fetchAuthSession(),
                ]);

                if (cancelled) {
                    return;
                }

                applyAuthenticatedState(nextUser, nextSession, {
                    broadcast: false,
                });
            } catch (error) {
                if (!isApiError(error, 401)) {
                    if (!cancelled) {
                        setStatus("error");
                    }

                    return;
                }

                try {
                    const nextSession = await refreshAuthSession();
                    const nextUser = await fetchCurrentUser();

                    if (cancelled) {
                        return;
                    }

                    applyAuthenticatedState(nextUser, nextSession, {
                        broadcast: true,
                    });
                } catch (refreshError) {
                    if (cancelled) {
                        return;
                    }

                    if (isApiError(refreshError, 401)) {
                        applyAnonymousState();
                    } else {
                        setStatus("error");
                    }
                }
            }
        }

        void bootstrapAuth();

        return () => {
            cancelled = true;
        };
    }, [applyAnonymousState, applyAuthenticatedState]);

    useEffect(() => {
        function handleResume() {
            const nextRefreshAt = nextRefreshAtRef.current;

            if (nextRefreshAt !== null && Date.now() >= nextRefreshAt) {
                void refreshSessionRef.current().catch(() => undefined);
            }
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                handleResume();
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleResume);
        window.addEventListener("online", handleResume);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
            window.removeEventListener("focus", handleResume);
            window.removeEventListener("online", handleResume);
        };
    }, []);

    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, [clearTimers]);

    const login = useCallback((provider: OAuthProvider) => {
        const baseUrl = import.meta.env.VITE_BACKEND_BASE_URL;
        const returnPath = getAuthReturnPath(locationRef.current);
        const params = new URLSearchParams({
            r: toAbsoluteUrl(returnPath),
        });

        window.location.assign(
            `${baseUrl}/api/login/oauth/${provider}?${params.toString()}`
        );
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutAuthSession();
        } catch (error) {
            console.warn("Logout request failed", error);
        } finally {
            applyAnonymousState();
            channelRef.current?.postMessage({
                type: "logout",
            } satisfies AuthBroadcastMessage);
            navigateToLogin();
            toast.info("已登出");
        }
    }, [applyAnonymousState, navigateToLogin]);

    const value = useMemo(
        () => ({
            status,
            user,
            session,
            isLoggedIn: status === "authenticated",
            login,
            logout,
            refreshSession,
        }),
        [login, logout, refreshSession, session, status, user]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}
