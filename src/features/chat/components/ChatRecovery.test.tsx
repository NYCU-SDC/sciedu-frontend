// @vitest-environment jsdom
import { fireEvent, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { expect, it, vi } from "vitest";
import ChatRecovery from "./ChatRecovery";
import type { UseChatResult } from "../services/useChat";
import { ApiError } from "../../../shared/utils/api";
import { loginReturnTo } from "../../../shared/auth/loginReturnTo";
it("401 login action resets stale auth and remembers the chat route", () => {
    const client = new QueryClient();
    const reset = vi.spyOn(client, "resetQueries");
    const chat = {
        error: new ApiError("unauthorized", 401),
        recoveryMessage: null,
        reloadResult: vi.fn(),
    } as unknown as UseChatResult;
    const view = render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={["/chat/abc"]}>
                <ChatRecovery chat={chat} />
            </MemoryRouter>
        </QueryClientProvider>
    );
    fireEvent.click(view.getByRole("link", { name: "重新登入" }));
    expect(reset).toHaveBeenCalledWith({
        queryKey: ["auth", "session"],
        exact: true,
    });
    expect(loginReturnTo()).toBe("/chat/abc");
    view.unmount();
    client.clear();
});
