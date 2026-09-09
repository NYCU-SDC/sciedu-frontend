import { api } from "../../../../shared/utils/api";
import type {
    CourseDefinition,
    CoursePageRequest,
    MaterialPage,
} from "../types/types";

type CourseResponse = {
    id: string;
    code: string;
    title: string;
    description?: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type PageResponse = {
    id: string;
    courseId: string;
    title: string;
    displayOrder: number;
};

type PageBlock = {
    id: string;
    pageId: string;
    type: "TEXT" | "MEDIA" | "QUESTION";
    resourceId: string;
    displayOrder: number;
    required: boolean;
};

type PageDetail = PageResponse & { blocks: PageBlock[] };

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCourseUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}

function materialFromPage(page: PageDetail, index: number): CoursePageRequest {
    const blocks = [...page.blocks].sort(
        (left, right) => left.displayOrder - right.displayOrder
    );
    const description = blocks.find(
        (block) => block.type === "TEXT" && block.displayOrder === 0
    );
    const imageIds = blocks
        .filter(
            (block) =>
                block.type === "MEDIA" &&
                block.displayOrder >= 10 &&
                block.displayOrder < 100
        )
        .map((block) => block.resourceId);
    const questionSections = blocks
        .filter(
            (block) =>
                block.type === "TEXT" &&
                block.displayOrder >= 100 &&
                block.displayOrder % 10 === 0
        )
        .map((titleBlock) => {
            const questionBlock = blocks.find(
                (block) =>
                    block.type === "QUESTION" &&
                    block.displayOrder === titleBlock.displayOrder + 1
            );
            if (!questionBlock) {
                throw new Error(
                    `教材頁「${page.title}」的題目 ${titleBlock.displayOrder} 缺少 QUESTION block`
                );
            }
            return {
                titleId: titleBlock.resourceId,
                questionId: questionBlock.resourceId,
            };
        });

    if (!description) {
        throw new Error(
            `教材頁「${page.title}」缺少 displayOrder 0 的教材文字`
        );
    }
    if (imageIds.length === 0) {
        throw new Error(`教材頁「${page.title}」沒有圖片`);
    }
    if (questionSections.length === 0) {
        throw new Error(`教材頁「${page.title}」沒有題目`);
    }

    const request: MaterialPage = {
        type: "material",
        content: {
            imageIds,
            descriptionId: description.resourceId,
        },
        questionSections,
    };

    return {
        pageIndex: index,
        request,
        activeNavbarTitles: [index],
        secondaryTitle: page.title,
    };
}

export async function fetchCourseDefinition(
    courseId: string
): Promise<CourseDefinition> {
    const [course, pages] = await Promise.all([
        api<CourseResponse>(`/api/courses/${courseId}`),
        api<PageResponse[]>(`/api/courses/${courseId}/pages`),
    ]);
    const orderedPages = [...pages].sort(
        (left, right) => left.displayOrder - right.displayOrder
    );
    const pageDetails = await Promise.all(
        orderedPages.map((page) => api<PageDetail>(`/api/pages/${page.id}`))
    );

    return {
        id: course.id,
        code: course.code,
        title: course.title,
        pages: pageDetails.map(materialFromPage),
        navigation:
            course.code === "brain-computer-interface" ? "stepper" : "classic",
    };
}
