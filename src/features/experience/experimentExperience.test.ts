import { expect, it } from "vitest";
import {
    displayStatus,
    encodeExperience,
    parseExperience,
} from "./experimentExperience";
const e = {
    status: "ACTIVE" as const,
    scheduledStartAt: "2026-10-27T09:00:00+08:00",
    scheduledEndAt: "2026-10-27T16:00:00+08:00",
};
it("classifies exact start/end instants independently of timezone", () => {
    expect(displayStatus(e, Date.parse("2026-10-27T00:59:59Z"))).toBe(
        "NOT_STARTED"
    );
    expect(displayStatus(e, Date.parse("2026-10-27T01:00:00Z"))).toBe("ACTIVE");
    expect(displayStatus(e, Date.parse("2026-10-27T08:00:00Z"))).toBe("ENDED");
    expect(displayStatus({ ...e, status: "ARCHIVED" }, Infinity)).toBe(
        "ARCHIVED"
    );
    expect(displayStatus({ ...e, status: "SCHEDULED" }, Infinity)).toBe(
        "EXPIRED_SCHEDULE"
    );
});
it("round trips practice descriptions and refuses unknown/duplicate metadata", () => {
    expect(parseExperience(encodeExperience("測試內容", "practice"))).toEqual({
        description: "測試內容",
        mode: "practice",
        valid: true,
    });
    expect(parseExperience("一般說明").mode).toBe("standard");
    expect(
        parseExperience("說明\n<!-- sciedu-experience:v2:practice -->").valid
    ).toBe(false);
    expect(
        parseExperience(encodeExperience("", "practice").repeat(2)).valid
    ).toBe(false);
    expect(() => encodeExperience("a".repeat(3990), "practice")).toThrow();
});

it("preserves descriptions and locks practice mode after activation", async () => {
    const { demoExperiment } = await import("../admin/data/demoAdminData");
    const { buildExperimentPayload, experimentToDraft } =
        await import("../admin/services/experimentDraft");
    for (const status of ["DRAFT", "SCHEDULED"] as const) {
        const original = {
            ...demoExperiment,
            status,
            description: "  原本說明  ",
        };
        const draft = experimentToDraft(original);
        expect(buildExperimentPayload(draft, original).description).toBe(
            original.description
        );
        const practice = buildExperimentPayload(
            { ...draft, mode: "practice" },
            original
        );
        expect(parseExperience(practice.description).mode).toBe("practice");
        const active = { ...original, ...practice, status: "ACTIVE" as const };
        expect(
            buildExperimentPayload(
                { ...experimentToDraft(active), mode: "standard" },
                active
            ).description
        ).toBe(practice.description);
    }
});
