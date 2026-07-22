import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import type { GeneticsManifest, MaterialManifestPage } from "../shared/types";

function pixels(value: number, size: number): number {
    return Math.max(0, Math.round(value * size));
}

export async function renderPageCrop(
    dataRoot: string,
    page: MaterialManifestPage
): Promise<string> {
    const source = join(dataRoot, "source", page.sourceImage);
    const outputRoot = join(dataRoot, "crops");
    const output = join(outputRoot, `${page.id}.jpg`);
    await mkdir(outputRoot, { recursive: true });
    const left = pixels(page.crop.x, 1920);
    const top = pixels(page.crop.y, 1080);
    const width = Math.min(pixels(page.crop.width, 1920), 1920 - left);
    const height = Math.min(pixels(page.crop.height, 1080), 1080 - top);
    if (width < 1 || height < 1)
        throw new Error(`${page.id} has an invalid crop`);
    await sharp(source)
        .extract({ left, top, width, height })
        .jpeg({ quality: 95 })
        .toFile(output);
    return output;
}

export async function renderCropPreview(
    dataRoot: string,
    page: MaterialManifestPage
): Promise<Buffer> {
    const source = join(dataRoot, "source", page.sourceImage);
    const left = pixels(page.crop.x, 1920);
    const top = pixels(page.crop.y, 1080);
    const width = Math.min(pixels(page.crop.width, 1920), 1920 - left);
    const height = Math.min(pixels(page.crop.height, 1080), 1080 - top);
    if (width < 1 || height < 1)
        throw new Error(`${page.id} has an invalid crop`);
    return sharp(source)
        .extract({ left, top, width, height })
        .jpeg({ quality: 95 })
        .toBuffer();
}

export async function renderAllCrops(
    dataRoot: string,
    manifest: GeneticsManifest
): Promise<void> {
    for (const page of manifest.units.flatMap((unit) => unit.pages)) {
        if (page.type === "material") await renderPageCrop(dataRoot, page);
    }
}
