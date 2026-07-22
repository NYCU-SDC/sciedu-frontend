import type { CourseUnit } from "../types/types";

export function selectCourseUnit(
    units: CourseUnit[],
    routeId: string | undefined
): CourseUnit | undefined {
    if (!routeId) return undefined;
    return units.find((unit) => unit.id === routeId);
}

export function nextCourseLocation(
    units: CourseUnit[],
    currentUnitId: string,
    currentPageIndex: number
): string | undefined {
    const ordered = [...units].sort((a, b) => a.order - b.order);
    const unitIndex = ordered.findIndex((unit) => unit.id === currentUnitId);
    if (unitIndex < 0) return undefined;
    const current = ordered[unitIndex];
    if (currentPageIndex !== current.pages.length - 1) return undefined;
    const next = ordered[unitIndex + 1];
    return next ? `/course/${next.id}` : undefined;
}

export function canNavigateToPage(
    targetPageIndex: number,
    unlockedPageIndex: number
): boolean {
    return targetPageIndex >= 0 && targetPageIndex <= unlockedPageIndex;
}
