import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import sharp from "sharp";

export type UploadedImage = {
    fileName: string;
    sha256: string;
    width: number;
    height: number;
};

export async function inspectJpeg(
    buffer: Buffer
): Promise<Omit<UploadedImage, "fileName">> {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== "jpeg") throw new Error("image must be a JPG file");
    if (!metadata.width || !metadata.height)
        throw new Error("image dimensions are missing");
    if (metadata.width < 100 || metadata.height < 100) {
        throw new Error("image must be at least 100x100 pixels");
    }
    if (metadata.width > 10000 || metadata.height > 10000) {
        throw new Error("image dimensions must not exceed 10000x10000 pixels");
    }
    return {
        sha256: createHash("sha256").update(buffer).digest("hex"),
        width: metadata.width,
        height: metadata.height,
    };
}

export async function saveUploadedImage(
    dataRoot: string,
    pageId: string,
    buffer: Buffer
): Promise<UploadedImage> {
    const inspected = await inspectJpeg(buffer);
    const fileName = `${pageId}.jpg`;
    const destination = join(dataRoot, "images", fileName);
    await mkdir(dirname(destination), { recursive: true });
    const temporary = `${destination}.tmp`;
    await writeFile(temporary, buffer);
    await rename(temporary, destination);
    return { fileName, ...inspected };
}
