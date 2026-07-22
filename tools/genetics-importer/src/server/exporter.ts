import { execFile } from "node:child_process";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

import YAML from "yaml";

import { renderCourseResource } from "./generator";
import type { GeneticsManifest, PublishState } from "../shared/types";

const execFileAsync = promisify(execFile);

type ExportFile = { absolutePath: string; content: Buffer };

async function atomicWrite(path: string, content: Buffer): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await writeFile(temporary, content);
    await rename(temporary, path);
}

async function assertGitRoot(outputRoot: string): Promise<string> {
    const resolved = resolve(outputRoot);
    const { stdout } = await execFileAsync("git", [
        "-C",
        resolved,
        "rev-parse",
        "--show-toplevel",
    ]);
    const root = resolve(stdout.trim());
    if (root !== resolved) {
        throw new Error("output root must be the root of a Git worktree");
    }
    return root;
}

async function exportFiles(
    toolRoot: string,
    dataRoot: string,
    outputRoot: string,
    manifest: GeneticsManifest,
    state: PublishState
): Promise<ExportFile[]> {
    const contentRoot = join(outputRoot, "content", "genetics");
    const generatedName = `courseResource.generated.${state.environment}.ts`;
    const files: ExportFile[] = [
        {
            absolutePath: join(contentRoot, "manifest.yaml"),
            content: Buffer.from(YAML.stringify(manifest)),
        },
        {
            absolutePath: join(contentRoot, "manifest.schema.json"),
            content: await readFile(join(toolRoot, "manifest.schema.json")),
        },
        {
            absolutePath: join(
                contentRoot,
                `publish-state.${state.environment}.json`
            ),
            content: Buffer.from(`${JSON.stringify(state, null, 2)}\n`),
        },
        {
            absolutePath: join(
                outputRoot,
                "src/features/courses/genetics/assets",
                generatedName
            ),
            content: Buffer.from(renderCourseResource(manifest, state)),
        },
    ];
    for (const page of manifest.units.flatMap((unit) => unit.pages)) {
        if (page.type !== "material") continue;
        files.push({
            absolutePath: join(contentRoot, "assets", `${page.id}.jpg`),
            content: await readFile(join(dataRoot, "crops", `${page.id}.jpg`)),
        });
    }
    return files;
}

export async function previewExport(input: {
    toolRoot: string;
    dataRoot: string;
    outputRoot: string;
    manifest: GeneticsManifest;
    state: PublishState;
}): Promise<{
    files: { path: string; status: "create" | "update" | "unchanged" }[];
}> {
    const root = await assertGitRoot(input.outputRoot);
    const files = await exportFiles(
        input.toolRoot,
        input.dataRoot,
        root,
        input.manifest,
        input.state
    );
    const preview = [];
    for (const file of files) {
        const existing = await readFile(file.absolutePath).catch(
            () => undefined
        );
        preview.push({
            path: relative(root, file.absolutePath),
            status: !existing
                ? ("create" as const)
                : existing.equals(file.content)
                  ? ("unchanged" as const)
                  : ("update" as const),
        });
    }
    return { files: preview };
}

export async function applyExport(input: {
    toolRoot: string;
    dataRoot: string;
    outputRoot: string;
    manifest: GeneticsManifest;
    state: PublishState;
    confirmation: string;
}): Promise<{ written: string[] }> {
    if (input.confirmation !== `EXPORT ${input.state.environment}`) {
        throw new Error(
            `confirmation must be EXPORT ${input.state.environment}`
        );
    }
    const root = await assertGitRoot(input.outputRoot);
    const files = await exportFiles(
        input.toolRoot,
        input.dataRoot,
        root,
        input.manifest,
        input.state
    );
    for (const file of files) {
        const exists = await stat(file.absolutePath).then(
            () => true,
            () => false
        );
        if (!exists) continue;
        const path = relative(root, file.absolutePath);
        const { stdout } = await execFileAsync("git", [
            "-C",
            root,
            "status",
            "--porcelain",
            "--",
            path,
        ]);
        if (stdout.trim()) {
            throw new Error(`refusing to overwrite modified output ${path}`);
        }
    }
    for (const file of files)
        await atomicWrite(file.absolutePath, file.content);
    return { written: files.map((file) => relative(root, file.absolutePath)) };
}
