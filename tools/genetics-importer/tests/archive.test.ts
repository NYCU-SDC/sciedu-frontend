import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import AdmZip from "adm-zip";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { importArchive } from "../src/server/archive";

describe("Genetics source archive", () => {
    it("extracts nested JPG files and records their dimensions and hashes", async () => {
        const image = await sharp({
            create: {
                width: 1920,
                height: 1080,
                channels: 3,
                background: "white",
            },
        })
            .jpeg()
            .toBuffer();
        const zip = new AdmZip();
        zip.addFile("Genetics Course/TA.jpg", image);
        const root = await mkdtemp(join(tmpdir(), "genetics-import-test-"));

        const result = await importArchive(zip.toBuffer(), root, ["TA.jpg"]);

        expect(result.files).toEqual([
            expect.objectContaining({
                name: "TA.jpg",
                width: 1920,
                height: 1080,
            }),
        ]);
        expect(result.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(await readFile(join(root, "source", "TA.jpg"))).toEqual(image);
    });

    it("rejects duplicate basenames from different archive folders", async () => {
        const zip = new AdmZip();
        zip.addFile("first/TA.jpg", Buffer.from("one"));
        zip.addFile("second/TA.jpg", Buffer.from("two"));
        const root = await mkdtemp(join(tmpdir(), "genetics-import-test-"));

        await expect(
            importArchive(zip.toBuffer(), root, ["TA.jpg"])
        ).rejects.toThrow(/duplicate source image TA\.jpg/);
    });
});
