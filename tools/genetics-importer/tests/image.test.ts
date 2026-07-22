import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { inspectJpeg, saveUploadedImage } from "../src/server/image";

describe("pre-cropped image upload", () => {
    it("validates and preserves the uploaded JPG", async () => {
        const image = await sharp({
            create: {
                width: 640,
                height: 360,
                channels: 3,
                background: "white",
            },
        })
            .jpeg()
            .toBuffer();
        const root = await mkdtemp(join(tmpdir(), "genetics-image-test-"));

        const result = await saveUploadedImage(root, "1A", image);

        expect(result).toMatchObject({
            fileName: "1A.jpg",
            width: 640,
            height: 360,
        });
        expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(await readFile(join(root, "images", "1A.jpg"))).toEqual(image);
    });

    it("rejects non-JPG input", async () => {
        const image = await sharp({
            create: {
                width: 640,
                height: 360,
                channels: 3,
                background: "white",
            },
        })
            .png()
            .toBuffer();

        await expect(inspectJpeg(image)).rejects.toThrow(/must be a JPG/);
    });
});
