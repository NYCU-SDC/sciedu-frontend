import type { CoursePageRequest } from "../types/types";

export type PageBlock = {
    id: string;
    pageId: string;
    type: "TEXT" | "MEDIA" | "QUESTION";
    resourceId: string;
    displayOrder: number;
    required: boolean;
};
export type PageDetail = {
    id: string;
    courseId: string;
    title: string;
    displayOrder: number;
    blocks: PageBlock[];
};

/** Ordered blocks have no layout metadata. Media pages use the importer
 * convention; question-only and text-only pages preserve content in one column.
 * Only the material importer reserves TEXT order 200 for hidden LLM context.
 */
export function mapPageBlocksToCoursePage(
    page: PageDetail,
    pageIndex: number
): CoursePageRequest {
    const blocks = [...page.blocks].sort(
        (a, b) => a.displayOrder - b.displayOrder
    );
    const base = {
        pageIndex,
        activeNavbarTitles: [pageIndex],
        secondaryTitle: page.title,
    };
    const media = blocks.filter((block) => block.type === "MEDIA");
    if (media.length === 0) {
        const questions = blocks.filter((block) => block.type === "QUESTION");
        if (questions.length === 0) {
            const texts = blocks.filter((block) => block.type === "TEXT");
            if (!texts.length)
                throw new Error(`教材頁「${page.title}」沒有內容`);
            return {
                ...base,
                request: {
                    type: "overview",
                    headerId: [],
                    contentId: texts.map((block) => [block.resourceId]),
                },
            };
        }
        const titleBlocks = new Set<PageBlock>();
        const mappedQuestions = questions.map((question) => {
            const previous = blocks[blocks.indexOf(question) - 1];
            const title = previous?.type === "TEXT" ? previous : undefined;
            if (title) titleBlocks.add(title);
            return {
                titleId: title?.resourceId,
                questionId: question.resourceId,
                required: question.required,
            };
        });
        return {
            ...base,
            request: {
                type: "questions",
                columns: [
                    {
                        labelIds: blocks
                            .filter(
                                (block) =>
                                    block.type === "TEXT" &&
                                    !titleBlocks.has(block)
                            )
                            .map((block) => block.resourceId),
                        questions: mappedQuestions,
                    },
                ],
            },
        };
    }
    const description = blocks.find(
        (block) => block.type === "TEXT" && block.displayOrder === 0
    );
    if (!description)
        throw new Error(
            `教材頁「${page.title}」缺少 displayOrder 0 的教材文字`
        );
    const questionSections = blocks
        .filter(
            (block) =>
                block.type === "TEXT" &&
                block.displayOrder >= 100 &&
                block.displayOrder < 200 &&
                block.displayOrder % 10 === 0
        )
        .map((title) => {
            const question = blocks.find(
                (block) =>
                    block.type === "QUESTION" &&
                    block.displayOrder === title.displayOrder + 1
            );
            if (!question)
                throw new Error(
                    `教材頁「${page.title}」的題目 ${title.displayOrder} 缺少 QUESTION block`
                );
            return {
                titleId: title.resourceId,
                questionId: question.resourceId,
                required: question.required,
            };
        });
    const mappedIds = new Set(
        questionSections.map((question) => question.questionId)
    );
    if (
        blocks.some(
            (block) =>
                block.type === "QUESTION" && !mappedIds.has(block.resourceId)
        )
    ) {
        throw new Error(`教材頁「${page.title}」含未對應標題的題目`);
    }
    return {
        ...base,
        request: {
            type: "material",
            content: {
                imageIds: media.map((block) => block.resourceId),
                descriptionId: description.resourceId,
            },
            questionSections,
        },
    };
}
