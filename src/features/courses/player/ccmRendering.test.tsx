// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MantineProvider } from "@mantine/core";
import { Theme } from "@radix-ui/themes";
import manifest from "../../../../tools/ccm/manifest.json";
import { api } from "../../../shared/utils/api";
import { fetchCourseDefinition } from "../genetics/services/fetchCourseDefinition";
import Material from "../genetics/layouts/Material";
import type { CourseChatController } from "../genetics/components/useCourseChatController";
vi.mock("../../../shared/utils/api", () => ({ api: vi.fn() }));
vi.mock("../genetics/components/CourseChat", () => ({
    default: () => <div data-testid="ccm-chat">CCM Chat</div>,
}));
const resources = new Map<string, unknown>();
const pages = manifest.pages.map((p, i) => {
    const id = `p${i}`;
    const blocks: {
        id: string;
        pageId: string;
        type: string;
        resourceId: string;
        displayOrder: number;
        required: boolean;
    }[] = [];
    const add = (
        suffix: string,
        type: string,
        displayOrder: number,
        data: object
    ) => {
        const resourceId = `${id}-${suffix}`;
        resources.set(
            `/api/${type === "QUESTION" ? "questions" : "content/text"}/${resourceId}`,
            { id: resourceId, ...data }
        );
        blocks.push({
            id: `${resourceId}-block`,
            pageId: id,
            type,
            resourceId,
            displayOrder,
            required: type === "QUESTION",
        });
    };
    add("body", "TEXT", 0, { content: p.description });
    add("hidden", "TEXT", 200, { content: p.imageDescriptionForLLM });
    add("settings", "TEXT", 201, { content: JSON.stringify(p.presentation) });
    p.images.forEach((_, j) => add(`image${j}`, "MEDIA", 10 + j, {}));
    p.questions.forEach((q, j) => {
        add(`label${j}`, "TEXT", 100 + j * 10, { content: q.label });
        add(`q${j}`, "QUESTION", 101 + j * 10, {
            type: "TEXT",
            content: q.prompt,
            options: [],
        });
    });
    const page = { id, courseId: "c", title: p.title, displayOrder: i, blocks };
    resources.set(`/api/pages/${id}`, page);
    return page;
});
resources.set("/api/courses/c", {
    id: "c",
    code: manifest.code,
    title: manifest.title,
});
resources.set("/api/courses/c/pages", pages);
beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn(() => ({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
    vi.mocked(api).mockImplementation(async (path) => {
        if (!resources.has(path)) throw Error(`Unexpected request ${path}`);
        return resources.get(path) as never;
    });
});
afterEach(cleanup);
it.each([0, 1, 2, 3, 4, 5, 6])(
    "page %s: API blocks become Markdown, interactive media and separate questions, never hidden prose",
    async (index) => {
        const definition = await fetchCourseDefinition("c", {
            variant: "stepper",
            mainTitle: "CCM",
        });
        const data = definition.pages[index];
        expect(data.request.type).toBe("material");
        expect(data.contextTextIds).toEqual([`p${index}-hidden`]);
        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const { container } = render(
            <MantineProvider>
                <Theme>
                    <QueryClientProvider client={client}>
                        <Material
                            data={data}
                            chat={{} as CourseChatController}
                            answers={{}}
                            isCompleted={false}
                            onNext={vi.fn()}
                            onAnswerChange={vi.fn()}
                        />
                    </QueryClientProvider>
                </Theme>
            </MantineProvider>
        );
        await screen.findByRole("heading", { level: 2, name: /STEP/ });
        const card = screen.getByLabelText("教材圖文與互動");
        if (index === 0)
            expect(within(card).getByAltText("教材圖片 1")).toBeTruthy();
        else
            expect(card.querySelector("iframe")?.getAttribute("src")).toContain(
                index < 4 ? "heart.html" : "marrow.html"
            );
        expect(screen.queryByTestId("ccm-chat") !== null).toBe(
            [2, 5].includes(index)
        );
        expect(container.textContent).not.toContain('"chatEnabled"');
        expect(container.textContent).not.toContain(
            manifest.pages[index].imageDescriptionForLLM
        );
        if ([1, 4].includes(index)) {
            expect(
                await screen.findByRole("radio", { name: "相同" })
            ).toBeTruthy();
            expect(screen.getByRole("radio", { name: "不相同" })).toBeTruthy();
            expect(screen.getAllByRole("textbox")).toHaveLength(2);
        }
        expect(card.querySelector("textarea")).toBeNull();
        client.clear();
    }
);
it("missing CCM settings stop loading instead of silently showing a default Chat or hidden text", async () => {
    const page = pages[0];
    resources.set("/api/pages/p0", {
        ...page,
        blocks: page.blocks.filter((b) => b.displayOrder !== 201),
    });
    try {
        await expect(
            fetchCourseDefinition("c", { variant: "stepper", mainTitle: "CCM" })
        ).rejects.toThrow("缺少頁面設定");
    } finally {
        resources.set("/api/pages/p0", page);
    }
});
