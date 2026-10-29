// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./AuthContext";
import { requestLogout } from "./requests";
import { getAttemptSessionId } from "./courseAttemptStorage";
vi.mock("@posthog/react", () => ({
    usePostHog: () => ({ capture: vi.fn(), reset: vi.fn(), identify: vi.fn() }),
}));
vi.mock("./requests", () => ({
    requestLogout: vi.fn(),
    refreshAuthToken: vi.fn(),
    getSession: async () => ({
        email: "student@example.test",
        username: "Student",
        accessTokenExpiresAt: "invalid",
        refreshTokenExpiresAt: "invalid",
    }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
function Consumer() {
    const auth = useAuth();
    return (
        <button disabled={auth.isLoading} onClick={() => void auth.logout()}>
            登出
        </button>
    );
}
afterEach(() => {
    cleanup();
    vi.resetAllMocks();
    sessionStorage.clear();
    localStorage.clear();
});
describe("logout attempt cleanup", () => {
    it.each([true, false])(
        "clears persisted attempts even if logout request success=%s",
        async (success) => {
            vi.mocked(requestLogout).mockImplementation(async () => {
                if (!success) throw Error("offline");
            });
            const client = new QueryClient({
                defaultOptions: { queries: { retry: false } },
            });
            const before = getAttemptSessionId();
            sessionStorage.setItem("sciedu-course-attempt:legacy", "secret");
            render(
                <QueryClientProvider client={client}>
                    <MemoryRouter>
                        <AuthProvider>
                            <Consumer />
                        </AuthProvider>
                    </MemoryRouter>
                </QueryClientProvider>
            );
            await waitFor(() =>
                expect(
                    (screen.getByText("登出") as HTMLButtonElement).disabled
                ).toBe(false)
            );
            fireEvent.click(screen.getByText("登出"));
            await waitFor(() => expect(requestLogout).toHaveBeenCalledOnce());
            expect(
                sessionStorage.getItem("sciedu-course-attempt:legacy")
            ).toBeNull();
            expect(getAttemptSessionId()).not.toBe(before);
            client.clear();
        }
    );
});
