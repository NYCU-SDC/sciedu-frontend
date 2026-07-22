import { describe, expect, it } from "vitest";

import {
    canNavigateToPage,
    nextCourseLocation,
    selectCourseUnit,
} from "./courseNavigation";
import type { CourseUnit } from "../types/types";

const units: CourseUnit[] = [
    {
        id: "T",
        title: "Template",
        category: "single-gene",
        order: 0,
        pages: [
            { pageIndex: 0 },
            { pageIndex: 1 },
            { pageIndex: 2 },
        ] as CourseUnit["pages"],
    },
    {
        id: "1",
        title: "Unit one",
        category: "single-gene",
        order: 1,
        pages: [{ pageIndex: 0 }] as CourseUnit["pages"],
    },
];

describe("Genetics course navigation", () => {
    it("selects the unit named by the route instead of ignoring it", () => {
        expect(selectCourseUnit(units, "1")?.title).toBe("Unit one");
        expect(selectCourseUnit(units, "missing")).toBeUndefined();
    });

    it("moves to the next unit only from the current unit's final page", () => {
        expect(nextCourseLocation(units, "T", 1)).toBeUndefined();
        expect(nextCourseLocation(units, "T", 2)).toBe("/course/1");
        expect(nextCourseLocation(units, "1", 0)).toBeUndefined();
    });

    it("keeps future navbar pages locked", () => {
        expect(canNavigateToPage(0, 0)).toBe(true);
        expect(canNavigateToPage(1, 0)).toBe(false);
        expect(canNavigateToPage(1, 2)).toBe(true);
    });
});
