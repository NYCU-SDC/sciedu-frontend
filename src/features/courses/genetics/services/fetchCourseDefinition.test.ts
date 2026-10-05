// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchCourseDefinition, isCourseUuid } from "./fetchCourseDefinition";

function response(body: unknown) {
    return {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(body),
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("fetchCourseDefinition", () => {
    it("loads a published course and builds its pages from block resources", async () => {
        const courseId = "10000000-0000-4000-8000-000000000001";
        const pageId = "20000000-0000-4000-8000-000000000001";
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                response({
                    id: courseId,
                    code: "GEN-01",
                    title: "遺傳教材",
                    status: "PUBLISHED",
                })
            )
            .mockResolvedValueOnce(
                response([
                    {
                        id: pageId,
                        courseId,
                        title: "觀察",
                        displayOrder: 1,
                    },
                ])
            )
            .mockResolvedValueOnce(
                response({
                    id: pageId,
                    courseId,
                    title: "觀察",
                    displayOrder: 1,
                    blocks: [
                        {
                            id: "block-1",
                            pageId,
                            type: "TEXT",
                            resourceId: "description-id",
                            displayOrder: 0,
                            required: true,
                        },
                        {
                            id: "block-2",
                            pageId,
                            type: "MEDIA",
                            resourceId: "image-id",
                            displayOrder: 10,
                            required: true,
                        },
                        {
                            id: "block-3",
                            pageId,
                            type: "TEXT",
                            resourceId: "question-title-id",
                            displayOrder: 100,
                            required: true,
                        },
                        {
                            id: "block-4",
                            pageId,
                            type: "QUESTION",
                            resourceId: "question-id",
                            displayOrder: 101,
                            required: true,
                        },
                        {
                            id: "block-5",
                            pageId,
                            type: "TEXT",
                            resourceId: "llm-image-description-id",
                            displayOrder: 200,
                            required: true,
                        },
                    ],
                })
            );
        vi.stubGlobal("fetch", fetchMock);

        await expect(fetchCourseDefinition(courseId)).resolves.toMatchObject({
            id: courseId,
            code: "GEN-01",
            title: "遺傳教材",
            pages: [
                {
                    pageIndex: 0,
                    secondaryTitle: "觀察",
                    request: {
                        type: "material",
                        content: {
                            descriptionId: "description-id",
                            imageIds: ["image-id"],
                        },
                        questionSections: [
                            {
                                titleId: "question-title-id",
                                questionId: "question-id",
                            },
                        ],
                    },
                },
            ],
        });
    });

    it("accepts only UUID course IDs", () => {
        expect(isCourseUuid("10000000-0000-4000-8000-000000000001")).toBe(true);
        expect(isCourseUuid("pea-seed-coat-1")).toBe(false);
    });
});
