import { describe, expect, it } from "vitest";

import { buildManualManifest, validateManifest } from "../src/server/manifest";

describe("manual Genetics manifest", () => {
    it("builds the fixed 30-page route skeleton without source content", () => {
        const manifest = buildManualManifest();

        expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
        expect(manifest.version).toBe(2);
        expect(manifest.authoring.mode).toBe("manual");
        expect(manifest.units.flatMap((unit) => unit.pages)).toHaveLength(30);
        expect(manifest.units[0].pages[0]).toMatchObject({
            id: "TA",
            type: "material",
        });
        expect(manifest.units[0].pages[0]).not.toHaveProperty("image");
    });

    it("rejects a changed route contract", () => {
        const manifest = buildManualManifest();
        manifest.course.unitOrder = manifest.course.unitOrder.slice(1);

        expect(validateManifest(manifest)).toEqual(
            expect.objectContaining({ valid: false })
        );
    });
});
