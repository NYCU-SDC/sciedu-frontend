import { describe, expect, it } from "vitest";
import {
    mapPageBlocksToCoursePage,
    type PageBlock,
    type PageDetail,
} from "./fetchCourseDefinition";

const block = (
    type: PageBlock["type"],
    resourceId: string,
    displayOrder: number
): PageBlock => ({
    id: `block-${displayOrder}`,
    pageId: "page-1",
    type,
    resourceId,
    displayOrder,
    required: true,
});

const page = (blocks: PageBlock[]): PageDetail => ({
    id: "page-1",
    courseId: "course-1",
    title: "第一頁",
    displayOrder: 7,
    blocks,
});

describe("mapPageBlocksToCoursePage", () => {
    it("maps and orders description, multiple images, and question pairs", () => {
        const result = mapPageBlocksToCoursePage(
            page([
                block("QUESTION", "question-2", 111),
                block("MEDIA", "image-2", 20),
                block("TEXT", "title-1", 100),
                block("TEXT", "description", 0),
                block("MEDIA", "image-1", 10),
                block("QUESTION", "question-1", 101),
                block("TEXT", "title-2", 110),
            ]),
            3
        );

        expect(result).toEqual({
            pageIndex: 3,
            activeNavbarTitles: [3],
            secondaryTitle: "第一頁",
            request: {
                type: "material",
                content: {
                    descriptionId: "description",
                    imageIds: ["image-1", "image-2"],
                },
                questionSections: [
                    { titleId: "title-1", questionId: "question-1" },
                    { titleId: "title-2", questionId: "question-2" },
                ],
            },
        });
    });

    it("rejects a question title without its adjacent QUESTION block", () => {
        expect(() =>
            mapPageBlocksToCoursePage(
                page([
                    block("TEXT", "description", 0),
                    block("MEDIA", "image", 10),
                    block("TEXT", "title", 100),
                ]),
                0
            )
        ).toThrow("缺少 QUESTION block");
    });

    it("ignores the LLM-only description at displayOrder 200", () => {
        const result = mapPageBlocksToCoursePage(
            page([
                block("TEXT", "description", 0),
                block("MEDIA", "image", 10),
                block("TEXT", "title", 100),
                block("QUESTION", "question", 101),
                block("TEXT", "llm-image-description", 200),
            ]),
            0
        );

        expect(result.request.type).toBe("material");
        expect(
            result.request.type === "material" &&
                result.request.questionSections
        ).toEqual([{ titleId: "title", questionId: "question" }]);
    });
});
