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
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import CourseRun from "./CourseRun";
import { parsePresentation } from "../courses/player/presentation";
import type { CourseDefinition } from "../courses/genetics/types/types";
import { prepareMaterialMessage } from "../courses/chat/prepareMaterialMessage";
import {
    decodeMaterialMessage,
    materialPreset,
} from "../../shared/network/materialChat";
import { courseChatKey } from "../../shared/auth/courseChatStorage";
import argumentation from "../../../tools/argumentation/manifest.json";
import ccm from "../../../tools/ccm/manifest.json";
const mock = vi.hoisted(() => ({
    api: vi.fn(),
    chat: vi.fn(),
    submit: vi.fn(),
}));
vi.mock("@posthog/react", () => ({ usePostHog: () => ({ capture: vi.fn() }) }));
vi.mock("../../shared/hooks", () => ({ useDocumentTitle: vi.fn() }));
vi.mock("../../shared/utils/api", () => ({
    api: mock.api,
    ApiError: class extends Error {},
}));
vi.mock("../courses/genetics/services/submitAnswer", () => ({
    submitAnswer: mock.submit,
}));
vi.mock("../courses/genetics/components/useCourseChatController", () => ({
    useCourseChatController: (
        scope: unknown,
        title: string,
        active: boolean
    ) => {
        mock.chat(scope, title, active);
        return {};
    },
}));
vi.mock("../courses/genetics/components/CourseChat", () => ({
    default: () => <div>測試討論區</div>,
}));
vi.mock("../courses/player/Simulation", () => ({
    default: () => <div>Simulation controls</div>,
}));
vi.mock("./useLearningLock", () => ({
    useLearningLock: () => ({ acquired: true }),
}));
let client: QueryClient;
beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mock.chat.mockClear();
    mock.submit.mockClear();
    mock.api.mockReset();
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    });
    globalThis.ResizeObserver = class {
        observe() {}
        disconnect() {}
        unobserve() {}
    };
});
afterEach(() => {
    cleanup();
    client?.clear();
});
for (const manifest of [argumentation, ccm])
    it(`${manifest.code}: three complete local rounds, new page chats, correct context and zero formal submissions`, async () => {
        const resources: Record<string, unknown> = {};
        const definition: CourseDefinition = {
            id: "course",
            code: manifest.code,
            title: manifest.title,
            navigation: { variant: "stepper", mainTitle: "Test" },
            pages: manifest.pages.map((p, i) => {
                resources[`/api/content/text/body${i}`] = {
                    content: p.description,
                };
                resources[`/api/content/text/context${i}`] = {
                    content: p.imageDescriptionForLLM,
                };
                p.questions.forEach((q, j) => {
                    resources[`/api/content/text/title${i}-${j}`] = {
                        content: q.label,
                    };
                    resources[`/api/questions/q${i}-${j}`] = {
                        id: `q${i}-${j}`,
                        type: "TEXT",
                        content: q.prompt,
                        options: [],
                    };
                });
                return {
                    pageId: `p${i}`,
                    pageIndex: i,
                    secondaryTitle: p.title,
                    activeNavbarTitles: [i],
                    contextTextIds: [`context${i}`],
                    request: {
                        type: "material",
                        presentation: parsePresentation(
                            JSON.stringify(p.presentation),
                            i
                        ),
                        content: { imageIds: [], descriptionId: `body${i}` },
                        questionSections: p.questions.map((_, j) => ({
                            titleId: `title${i}-${j}`,
                            questionId: `q${i}-${j}`,
                            required: true,
                        })),
                    },
                };
            }),
        };
        mock.api.mockImplementation(async (path: string) => {
            if (!(path in resources)) throw Error(`Unexpected API ${path}`);
            return resources[path];
        });
        client = new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: 0 } },
        });
        const complete = vi.fn();
        render(
            <MantineProvider>
                <QueryClientProvider client={client}>
                    <MemoryRouter>
                        <CourseRun
                            definition={definition}
                            practice
                            chatScope={{
                                account: "student",
                                experimentId: "exp",
                                courseId: "course",
                            }}
                            onComplete={complete}
                        />
                    </MemoryRouter>
                </QueryClientProvider>
            </MantineProvider>
        );
        for (let round = 0; round < 3; round++) {
            for (let i = 0; i < manifest.pages.length; i++) {
                const p = manifest.pages[i];
                const notice = screen.queryByRole("dialog", {
                    name: "Mental Set 2",
                });
                if (notice) {
                    fireEvent.click(
                        within(notice).getByRole("button", { name: /關閉/ })
                    );
                    await waitFor(() =>
                        expect(
                            screen.queryByRole("dialog", {
                                name: "Mental Set 2",
                            })
                        ).toBeNull()
                    );
                }
                const section = document.querySelector(
                    'section[aria-hidden="false"]'
                ) as HTMLElement;
                if (p.questions.length)
                    await within(section).findAllByRole("textbox");
                if (i === 0 && round === 0) {
                    fireEvent.click(
                        within(section).getByRole("button", {
                            name: "送出並前往下一頁",
                        })
                    );
                    expect(
                        await screen.findAllByText("此題為必填")
                    ).toHaveLength(p.questions.length);
                }
                for (const box of within(section).queryAllByRole("textbox"))
                    fireEvent.change(box, {
                        target: {
                            value: `第 ${round + 1} 輪第 ${i + 1} 頁回答`,
                        },
                    });
                const option = within(section).queryByRole("radio", {
                    name: "相同",
                });
                if (option) fireEvent.click(option);
                expect(within(section).queryByText("測試討論區") !== null).toBe(
                    p.presentation.chatEnabled
                );
                const next = within(section).getByRole("button", {
                    name: p.questions.length
                        ? "送出並前往下一頁"
                        : "前往下一頁",
                });
                fireEvent.click(next);
                if (i < manifest.pages.length - 1)
                    await waitFor(() =>
                        expect(
                            document.querySelector(
                                'section[aria-hidden="false"]'
                            )
                        ).not.toBe(section)
                    );
            }
            await waitFor(() =>
                expect(complete).toHaveBeenCalledTimes(round + 1)
            );
            const result = complete.mock.calls[round][0];
            expect(result.submissions).toEqual([]);
            expect(result.practice).toBe(true);
            const page = definition.pages.find(
                (p) =>
                    p.request.type === "material" &&
                    p.request.presentation?.chatEnabled
            )!;
            const scope = {
                account: "student",
                experimentId: "exp",
                courseId: "course",
                pageId: page.pageId!,
                roundId: result.roundId,
            };
            const message = await prepareMaterialMessage("教材在做什麼？", {
                definition,
                page,
                scope,
                practice: true,
                answersByPage: result.answersByPage,
                submissions: [],
                simulation: { led: false, partition: true },
            });
            const context = decodeMaterialMessage(message)!.context;
            expect(context.preset).toBe(materialPreset(manifest.code));
            expect(context.snapshot.mode).toBe("practice");
            expect(context.snapshot.roundId).toBe(result.roundId);
            expect(context.snapshot.page.descriptions.length).toBeGreaterThan(
                0
            );
            expect(
                context.snapshot.questions.every(
                    (q) => q.answer.submission === "local_practice"
                )
            ).toBe(true);
            if (round > 0)
                expect(courseChatKey(scope)).not.toContain(
                    complete.mock.calls[round - 1][0].roundId
                );
            if (round < 2) {
                fireEvent.click(
                    screen.getByRole("button", { name: "重新練習" })
                );
                fireEvent.click(
                    await screen.findByRole("button", { name: "開始新一輪" })
                );
                await screen.findByText(manifest.pages[0].questions[0].prompt);
                expect(
                    (screen.getAllByRole("textbox")[0] as HTMLTextAreaElement)
                        .value
                ).toBe("");
            }
        }
        expect(new Set(complete.mock.calls.map((c) => c[0].roundId)).size).toBe(
            3
        );
        expect(mock.submit).not.toHaveBeenCalled();
        expect(mock.api.mock.calls.some(([p]) => p.includes("/answers"))).toBe(
            false
        );
    }, 30000);
