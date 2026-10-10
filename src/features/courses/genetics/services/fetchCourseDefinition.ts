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

    return {
        id: course.id,
        code: course.code,
        title: course.title,
        pages: pageDetails.map(mapPageBlocksToCoursePage),
        navigation,
    };
}
