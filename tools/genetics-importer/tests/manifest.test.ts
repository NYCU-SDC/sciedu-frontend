import { describe, expect, it } from "vitest";
import { buildDraftManifest, validateManifest } from "../src/server/manifest";

const sourceFiles = [
    "TA.jpg",
    "TB.jpg",
    "TC.jpg",
    ...Array.from({ length: 8 }, (_, index) =>
        ["A", "B", "C"].map((suffix) => `${index + 1}${suffix}.jpg`)
    ).flat(),
    "1S.jpg",
    "2S.jpg",
    "F.jpg",
].map((name) => ({
    name,
    sha256: `sha-${name}`,
    width: 1920,
    height: 1080,
}));

describe("Genetics manifest import", () => {
    it("builds a valid 30-page draft from the expected archive", () => {
        const manifest = buildDraftManifest({
            archiveName: "Genetics Course.zip",
            archiveSha256: "archive-sha",
            files: sourceFiles,
        });

        expect(validateManifest(manifest)).toEqual({ valid: true, errors: [] });
        expect(manifest.units.flatMap((unit) => unit.pages)).toHaveLength(30);
        expect(manifest.course.unitOrder).toEqual([
            "T",
            "1",
            "2",
            "3",
            "4",
            "1S",
            "5",
            "6",
            "7",
            "8",
            "2S",
            "F",
        ]);
    });

    it("rejects a source archive with a missing page", () => {
        expect(() =>
            buildDraftManifest({
                archiveName: "Genetics Course.zip",
                archiveSha256: "archive-sha",
                files: sourceFiles.slice(1),
            })
        ).toThrow(/missing TA\.jpg/);
    });

    it("rejects source images with unexpected dimensions", () => {
        expect(() =>
            buildDraftManifest({
                archiveName: "Genetics Course.zip",
                archiveSha256: "archive-sha",
                files: sourceFiles.map((file, index) =>
                    index === 0 ? { ...file, width: 1280 } : file
                ),
            })
        ).toThrow(/TA\.jpg must be 1920x1080/);
    });
});
