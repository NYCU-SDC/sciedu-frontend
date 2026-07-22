import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import AdmZip from "adm-zip";
import sharp from "sharp";

import type { SourceImage } from "./manifest";

function sha256(value: Buffer): string {
    return createHash("sha256").update(value).digest("hex");
}

export async function importArchive(
    archive: Buffer,
    workspaceRoot: string,
    expectedNames: string[]
): Promise<{ archiveSha256: string; files: SourceImage[] }> {
    const zip = new AdmZip(archive);
    const expected = new Set(expectedNames);
    const entries = new Map<string, Buffer>();

    for (const entry of zip.getEntries()) {
        if (entry.isDirectory) continue;
        const name = basename(entry.entryName);
        if (extname(name).toLowerCase() !== ".jpg" || !expected.has(name)) {
            continue;
        }
        if (entries.has(name)) {
            throw new Error(`duplicate source image ${name}`);
        }
        entries.set(name, entry.getData());
    }

    const sourceRoot = join(workspaceRoot, "source");
    await mkdir(sourceRoot, { recursive: true });
    const files: SourceImage[] = [];
    for (const name of expectedNames) {
        const data = entries.get(name);
        if (!data) throw new Error(`missing ${name}`);
        const metadata = await sharp(data).metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error(`could not read dimensions for ${name}`);
        }
        await writeFile(join(sourceRoot, name), data);
        files.push({
            name,
            sha256: sha256(data),
            width: metadata.width,
            height: metadata.height,
        });
    }

    return { archiveSha256: sha256(archive), files };
}
