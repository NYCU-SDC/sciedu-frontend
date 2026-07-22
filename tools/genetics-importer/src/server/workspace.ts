import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";

import YAML from "yaml";

import type { GeneticsManifest, PublishState } from "../shared/types";

async function atomicWrite(path: string, content: string): Promise<void> {
    await mkdir(join(path, ".."), { recursive: true });
    const temporary = `${path}.tmp`;
    await writeFile(temporary, content, "utf8");
    await rename(temporary, path);
}

export async function loadManifest(
    dataRoot: string
): Promise<GeneticsManifest | undefined> {
    const content = await readFile(
        join(dataRoot, "manifest.yaml"),
        "utf8"
    ).catch(() => undefined);
    return content ? (YAML.parse(content) as GeneticsManifest) : undefined;
}

export async function saveManifest(
    dataRoot: string,
    manifest: GeneticsManifest
): Promise<void> {
    await atomicWrite(
        join(dataRoot, "manifest.yaml"),
        YAML.stringify(manifest)
    );
}

export async function loadPublishState(
    dataRoot: string,
    environment: "local" | "dev"
): Promise<PublishState | undefined> {
    const content = await readFile(
        join(dataRoot, `publish-state.${environment}.json`),
        "utf8"
    ).catch(() => undefined);
    return content ? (JSON.parse(content) as PublishState) : undefined;
}

export async function savePublishState(
    dataRoot: string,
    state: PublishState
): Promise<void> {
    await atomicWrite(
        join(dataRoot, `publish-state.${state.environment}.json`),
        `${JSON.stringify(state, null, 2)}\n`
    );
}
