// @vitest-environment jsdom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter, Route, Routes } from "react-router";
import {
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { theme } from "../../../mantineTheme";
import { demoExperiment, demoCurrentUser } from "../data/demoAdminData";
import * as repo from "../services/adminRepository";
import type { ExperimentStatus } from "../types";
import ExperimentDetailPage from "./ExperimentDetailPage";
vi.mock("../services/adminRepository", () => ({
    fetchCurrentUser: vi.fn(),
    fetchExperiment: vi.fn(),
    listExperimentCourses: vi.fn(),
    listExperimentParticipants: vi.fn(),
    updateExperimentStatus: vi.fn(),
    removeExperimentParticipant: vi.fn(),
}));
let current = {
    ...demoExperiment,
    status: "ACTIVE" as ExperimentStatus,
    courseCount: 1,
    participantCount: 1,
};
beforeAll(() => {
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    );
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            matches: false,
            addEventListener() {},
            removeEventListener() {},
        })),
    });
});
beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(
        Date.parse(demoExperiment.scheduledStartAt) + 1000
    );
    current = {
        ...demoExperiment,
        status: "ACTIVE",
        courseCount: 1,
        participantCount: 1,
    };
    vi.mocked(repo.fetchCurrentUser).mockResolvedValue(demoCurrentUser);
    vi.mocked(repo.fetchExperiment).mockImplementation(async () => current);
    vi.mocked(repo.listExperimentCourses).mockResolvedValue([]);
    vi.mocked(repo.listExperimentParticipants).mockResolvedValue([]);
    vi.mocked(repo.updateExperimentStatus).mockImplementation(
        async (_, status) => {
            current = { ...current, status };
            return current;
        }
    );
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});
function setup(status: ExperimentStatus = "ACTIVE") {
    current.status = status;
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MantineProvider theme={theme}>
                <MemoryRouter
                    initialEntries={[`/admin/experiments/${current.id}`]}
                >
                    <Routes>
                        <Route
                            path="/admin/experiments/:experimentId"
                            element={<ExperimentDetailPage />}
                        />
                    </Routes>
                </MemoryRouter>
            </MantineProvider>
        </QueryClientProvider>
    );
}
describe("experiment archive UI", () => {
    it.each([
        ["DRAFT", "取消並封存"],
        ["SCHEDULED", "取消並封存"],
        ["ACTIVE", "提前結束並封存"],
        ["COMPLETED", "封存實驗"],
    ] as const)(
        "provides %s archive and retains read-only detail",
        async (status, label) => {
            setup(status);
            fireEvent.click(await screen.findByRole("button", { name: label }));
            const dialog = await screen.findByRole("dialog");
            expect(within(dialog).getByText(current.name)).toBeTruthy();
            expect(within(dialog).getByText(/已提交答案會保留/)).toBeTruthy();
            expect(repo.updateExperimentStatus).not.toHaveBeenCalled();
            fireEvent.click(
                within(dialog).getByRole("button", { name: `確認${label}` })
            );
            await waitFor(() =>
                expect(
                    repo.updateExperimentStatus
                ).toHaveBeenCalledExactlyOnceWith(
                    current.id,
                    "ARCHIVED",
                    expect.any(AbortSignal)
                )
            );
            await waitFor(() =>
                expect(screen.queryByRole("dialog")).toBeNull()
            );
            expect(
                await screen.findByText("實驗已結束或封存，設定與指派均為唯讀")
            ).toBeTruthy();
            expect(screen.queryByRole("button", { name: label })).toBeNull();
        }
    );
    it("does not provide an archive action for ARCHIVED", async () => {
        setup("ARCHIVED");
        await screen.findByText("實驗已結束或封存，設定與指派均為唯讀");
        expect(screen.queryByRole("button", { name: /封存/ })).toBeNull();
    });
    it("cancels without sending and disables controls while submitting", async () => {
        setup();
        const trigger = await screen.findByRole("button", {
            name: "提前結束並封存",
        });
        fireEvent.click(trigger);
        fireEvent.click(
            within(await screen.findByRole("dialog")).getByRole("button", {
                name: "取消",
            })
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        expect(repo.updateExperimentStatus).not.toHaveBeenCalled();
        let finish!: (value: typeof current) => void;
        vi.mocked(repo.updateExperimentStatus).mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        fireEvent.click(trigger);
        const dialog = await screen.findByRole("dialog");
        fireEvent.click(
            within(dialog).getByRole("button", { name: "確認提前結束並封存" })
        );
        await waitFor(() =>
            expect(
                (
                    within(dialog).getByRole("button", {
                        name: "取消",
                    }) as HTMLButtonElement
                ).disabled
            ).toBe(true)
        );
        expect(
            (
                screen.getByRole("button", {
                    name: "延長時間或新增教材",
                    hidden: true,
                }) as HTMLButtonElement
            ).disabled
        ).toBe(true);
        current = { ...current, status: "ARCHIVED" };
        finish(current);
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });
});
