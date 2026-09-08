import { describe, expect, it } from "vitest";

import { getMaterialProgressLabel } from "./materialProgress";

describe("getMaterialProgressLabel", () => {
    it("uses the shared completed copy", () => {
        expect(
            getMaterialProgressLabel({
                status: "done",
                totalPages: 3,
                completedPage: 3,
            })
        ).toBe("共 3 頁．已完成全部");
    });

    it("describes in-progress and not-started materials", () => {
        expect(
            getMaterialProgressLabel({
                status: "in_progress",
                totalPages: 4,
                completedPage: 1,
            })
        ).toBe("共 4 頁．已完成第 1 頁");
        expect(
            getMaterialProgressLabel({
                status: "not_started",
                totalPages: 4,
                completedPage: 0,
            })
        ).toBe("共 4 頁．尚未開始");
    });
});
