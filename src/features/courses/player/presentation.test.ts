import { describe, expect, it } from "vitest";
import { parsePresentation } from "./presentation";
import {
    mapPageBlocksToCoursePage,
    type PageDetail,
} from "../genetics/services/mapCoursePage";
const config = {
    version: 1,
    stage: "simulation",
    chatEnabled: true,
    simulationId: "dark-room-v1",
};
describe("versioned course presentation", () => {
    it("rejects unknown scripts, malformed metadata and forward answer references", () => {
        for (const p of [
            "{",
            JSON.stringify({ ...config, version: 2 }),
            JSON.stringify({
                ...config,
                simulationId: "https://untrusted.test/script",
            }),
            JSON.stringify({ ...config, previousAnswerPageIndex: 2 }),
        ])
            expect(() => parsePresentation(p, 2)).toThrow("教材頁面設定");
    });
    it("maps a simulation-only material without leaking metadata or requiring images", () => {
        const p: PageDetail = {
            id: "p",
            courseId: "c",
            title: "互動",
            displayOrder: 2,
            blocks: [0, 200, 201].map((order) => ({
                id: String(order),
                pageId: "p",
                type: "TEXT",
                resourceId: "t" + order,
                displayOrder: order,
                required: false,
            })),
        };
        const result = mapPageBlocksToCoursePage(
            p,
            2,
            parsePresentation(JSON.stringify(config), 2)
        );
        expect(result.request).toMatchObject({
            type: "material",
            content: { descriptionId: "t0", imageIds: [] },
            questionSections: [],
        });
        expect(JSON.stringify(result)).not.toContain("t200");
        expect(JSON.stringify(result)).not.toContain("t201");
    });
});
