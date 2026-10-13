import { describe, expect, it } from "vitest";
import {
    mapPageBlocksToCoursePage,
    type PageBlock,
    type PageDetail,
} from "./mapCoursePage";
import { generateRQRequestFromPage } from "./fetchPageContent";
const block = (
    type: PageBlock["type"],
    resourceId: string,
    displayOrder: number,
    required = true
): PageBlock => ({
    id: resourceId,
    pageId: "page",
    type,
    resourceId,
    displayOrder,
    required,
});
const page = (blocks: PageBlock[]): PageDetail => ({
    id: "page",
    courseId: "course",
    title: "教材",
    displayOrder: 1,
    blocks,
});
describe("ordered API blocks", () => {
    it("preserves question-only pages, optional questions, and untitled questions", () => {
        const result = mapPageBlocksToCoursePage(
            page([
                block("QUESTION", "q2", 4, false),
                block("TEXT", "intro", 0),
                block("TEXT", "title", 1),
                block("QUESTION", "q1", 2),
            ]),
            0
        );
        expect(result.request).toEqual({
            type: "questions",
            columns: [
                {
                    labelIds: ["intro"],
                    questions: [
                        { titleId: "title", questionId: "q1", required: true },
                        {
                            titleId: undefined,
                            questionId: "q2",
                            required: false,
                        },
                    ],
                },
            ],
        });
        expect(
            generateRQRequestFromPage(result).map((x) => x.queryPath)
        ).toEqual([
            "/api/content/text/intro",
            "/api/content/text/title",
            "/api/questions/q1",
            "/api/questions/q2",
        ]);
    });
    it("preserves ordered text-only pages including ordinary text at order 200", () => {
        expect(
            mapPageBlocksToCoursePage(
                page([block("TEXT", "last", 200), block("TEXT", "first", 0)]),
                2
            ).request
        ).toEqual({
            type: "overview",
            headerId: [],
            contentId: [["first"], ["last"]],
        });
    });
    it("preserves all media but hides importer-only LLM text", () => {
        const result = mapPageBlocksToCoursePage(
            page([
                block("TEXT", "body", 0),
                block("MEDIA", "img2", 20),
                block("MEDIA", "img1", 10),
                block("TEXT", "title", 100),
                block("QUESTION", "q", 101, false),
                block("TEXT", "hidden", 200),
            ]),
            0
        );
        expect(result.request).toEqual({
            type: "material",
            content: { descriptionId: "body", imageIds: ["img1", "img2"] },
            questionSections: [
                { titleId: "title", questionId: "q", required: false },
            ],
        });
        expect(
            generateRQRequestFromPage(result).some((x) =>
                x.queryPath.includes("hidden")
            )
        ).toBe(false);
    });
    it("rejects orphan questions rather than silently omitting them", () => {
        expect(() =>
            mapPageBlocksToCoursePage(
                page([
                    block("TEXT", "body", 0),
                    block("MEDIA", "img", 10),
                    block("QUESTION", "orphan", 2),
                ]),
                0
            )
        ).toThrow("未對應標題");
    });
    it("rejects empty pages", () =>
        expect(() => mapPageBlocksToCoursePage(page([]), 0)).toThrow(
            "沒有內容"
        ));
});
