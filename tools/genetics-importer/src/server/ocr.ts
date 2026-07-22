import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { promisify } from "node:util";

import type {
    GeneticsManifest,
    OcrObservation,
    QuestionsManifestPage,
} from "../shared/types";

const execFileAsync = promisify(execFile);

type OcrResult = {
    path: string;
    observations: OcrObservation[];
    error?: string;
};

async function ensureHelper(
    toolRoot: string,
    dataRoot: string
): Promise<string> {
    const source = join(toolRoot, "swift", "OCR.swift");
    const helper = join(dataRoot, "bin", "genetics-ocr");
    await mkdir(join(dataRoot, "bin"), { recursive: true });
    const sourceStat = await stat(source);
    const helperStat = await stat(helper).catch(() => undefined);
    if (!helperStat || helperStat.mtimeMs < sourceStat.mtimeMs) {
        await execFileAsync("xcrun", ["swiftc", "-O", source, "-o", helper], {
            maxBuffer: 10 * 1024 * 1024,
        });
    }
    return helper;
}

export async function runAppleVisionOcr(
    toolRoot: string,
    dataRoot: string,
    imagePaths: string[]
): Promise<Map<string, OcrObservation[]>> {
    if (process.platform !== "darwin") {
        throw new Error("Apple Vision OCR requires macOS");
    }
    const helper = await ensureHelper(toolRoot, dataRoot);
    const { stdout } = await execFileAsync(helper, imagePaths, {
        maxBuffer: 100 * 1024 * 1024,
    });
    const results = JSON.parse(stdout) as OcrResult[];
    const byName = new Map<string, OcrObservation[]>();
    for (const result of results) {
        if (result.error)
            throw new Error(`${basename(result.path)}: ${result.error}`);
        byName.set(basename(result.path), result.observations);
    }
    return byName;
}

function sortedText(observations: OcrObservation[]): string {
    return [...observations]
        .sort((a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x)
        .map((item) => item.text.trim())
        .filter(Boolean)
        .join("\n");
}

function seedQuestionsPage(
    page: QuestionsManifestPage,
    observations: OcrObservation[]
): void {
    for (
        let columnIndex = 0;
        columnIndex < page.columns.length;
        columnIndex++
    ) {
        const minX = columnIndex / page.columns.length;
        const maxX = (columnIndex + 1) / page.columns.length;
        const items = observations.filter(
            (item) => item.bounds.x >= minX && item.bounds.x < maxX
        );
        const ordered = [...items].sort(
            (a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x
        );
        const column = page.columns[columnIndex];
        column.label.text = ordered.shift()?.text ?? "";
        const splitAt = Math.ceil(ordered.length / column.questions.length);
        column.questions.forEach((question, questionIndex) => {
            const group = ordered.slice(
                questionIndex * splitAt,
                (questionIndex + 1) * splitAt
            );
            question.title.text = group.shift()?.text ?? "";
            question.question.content = sortedText(group);
        });
    }
}

export function applyOcrDrafts(
    manifest: GeneticsManifest,
    observationsByFile: Map<string, OcrObservation[]>
): GeneticsManifest {
    for (const page of manifest.units.flatMap((unit) => unit.pages)) {
        const observations = observationsByFile.get(page.sourceImage) ?? [];
        page.ocrDraft = observations;
        if (page.type === "material") {
            page.description.text = sortedText(
                observations.filter(
                    (item) => item.bounds.x < 0.67 && item.bounds.y > 0.5
                )
            );
            const right = observations.filter((item) => item.bounds.x >= 0.64);
            page.questionSections.forEach((section, index) => {
                const minY = index / page.questionSections.length;
                const maxY = (index + 1) / page.questionSections.length;
                const group = right
                    .filter(
                        (item) => item.bounds.y >= minY && item.bounds.y < maxY
                    )
                    .sort((a, b) => a.bounds.y - b.bounds.y);
                section.title.text = group.shift()?.text ?? "";
                section.question.content = sortedText(group);
            });
        } else if (page.type === "questions") {
            seedQuestionsPage(page, observations);
        } else {
            const ordered = [...observations].sort(
                (a, b) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x
            );
            page.headers.forEach((header) => {
                header.text = ordered.shift()?.text ?? "";
            });
            for (const cell of page.rows.flat()) {
                cell.text = ordered.shift()?.text ?? "";
            }
        }
        page.approvals = {};
    }
    return manifest;
}
