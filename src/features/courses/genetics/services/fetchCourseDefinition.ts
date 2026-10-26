import { materialPreset } from "../../../../shared/network/materialChat";
import { parsePresentation } from "../../player/presentation";
import { api } from "../../../../shared/utils/api";
import type { CourseDefinition, CourseNavigation } from "../types/types";

export type CourseResponse = {
    id: string;
    code: string;
    title: string;
    description?: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type PageResponse = {
    id: string;
    courseId: string;
    title: string;
    displayOrder: number;
};

import { mapPageBlocksToCoursePage, type PageDetail } from "./mapCoursePage";
export {
    mapPageBlocksToCoursePage,
    type PageBlock,
    type PageDetail,
} from "./mapCoursePage";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isCourseUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}

export async function fetchCourseDefinition(
    courseId: string,
    navigation: CourseNavigation
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

    const mappedPages = await Promise.all(
        pageDetails.map(async (page, index) => {
            const configs = page.blocks.filter(
                (b) => b.type === "TEXT" && b.displayOrder === 201
            );
            if (configs.length > 1)
                throw new Error("教材頁面設定重複，請聯絡管理者。");
            const config = configs[0];
            const presentation = config
                ? parsePresentation(
                      (
                          await api<{ content: string }>(
                              `/api/content/text/${config.resourceId}`
                          )
                      ).content,
                      index
                  )
                : undefined;
            const mapped = mapPageBlocksToCoursePage(page, index, presentation);
            if (presentation && mapped.request.type === "material") {
                for (const index of Object.keys(
                    presentation.textChoices ?? {}
                )) {
                    if (Number(index) >= mapped.request.questionSections.length)
                        throw new Error("教材選項設定指向不存在的題目");
                }
            }
            if (materialPreset(course.code)) {
                mapped.contextTextIds = page.blocks
                    .filter((b) => b.type === "TEXT" && b.displayOrder === 200)
                    .map((b) => b.resourceId);
            }
            return mapped;
        })
    );

    for (const page of mappedPages) {
        if (page.request.type !== "material") continue;
        for (const reference of page.request.presentation?.answerReferences ??
            []) {
            const target = mappedPages[reference.pageIndex];
            if (
                target?.request.type !== "material" ||
                !target.request.questionSections[reference.questionIndex]
            )
                throw new Error("教材回答表格引用了不存在的題目");
        }
    }
    return {
        id: course.id,
        code: course.code,
        title: course.title,
        pages: mappedPages,
        navigation,
    };
}
