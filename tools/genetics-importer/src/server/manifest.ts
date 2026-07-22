import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

import manifestSchema from "../../manifest.schema.json";
import type {
    CourseUnit,
    GeneticsManifest,
    ManifestPage,
    MaterialManifestPage,
    OverviewManifestPage,
    QuestionsManifestPage,
    TextField,
} from "../shared/types";
import { UNIT_ORDER } from "../shared/types";

export type SourceImage = {
    name: string;
    sha256: string;
    width: number;
    height: number;
};

export type ValidationResult = {
    valid: boolean;
    errors: string[];
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(manifestSchema);

const UNIT_TITLES: Record<string, string> = {
    T: "豌豆－種皮顏色",
    "1": "豌豆－種皮形狀",
    "2": "豌豆－莖高",
    "3": "果蠅－眼色",
    "4": "果蠅－翅膀形狀",
    "1S": "單基因遺傳整合問題",
    "5": "金魚草－花色",
    "6": "血球－血球形狀",
    "7": "血球－抗原",
    "8": "二對基因位於不同染色體",
    "2S": "遺傳機制整合問題",
    F: "遺傳機制總覽",
};

function categoryForUnit(id: string): string {
    if (["5", "6", "7"].includes(id)) return "intermediate-codominant";
    if (["8", "2S"].includes(id)) return "two-gene";
    if (id === "F") return "overview";
    return "single-gene";
}

function activeNavbarTitles(id: string): number[] {
    const category = categoryForUnit(id);
    if (category === "single-gene") return [0];
    if (category === "intermediate-codominant") return [1];
    if (category === "two-gene") return [2];
    return [];
}

function textField(key: string): TextField {
    return { key, text: "" };
}

function createMaterialPage(
    unitId: string,
    suffix: string,
    source: SourceImage
): MaterialManifestPage {
    const pageId = `${unitId}${suffix}`;
    return {
        id: pageId,
        type: "material",
        sourceImage: source.name,
        sourceHash: source.sha256,
        secondaryTitle: UNIT_TITLES[unitId],
        activeNavbarTitles: activeNavbarTitles(unitId),
        crop: { x: 0.063, y: 0.16, width: 0.59, height: 0.39 },
        imageKey: `genetics.${pageId}.image`,
        description: textField(`genetics.${pageId}.description`),
        questionSections: Array.from({ length: 3 }, (_, index) => ({
            title: textField(`genetics.${pageId}.question.${index + 1}.title`),
            question: {
                key: `genetics.${pageId}.question.${index + 1}`,
                type: "TEXT" as const,
                content: "",
            },
        })),
        approvals: {},
    };
}

function createQuestionsPage(
    pageId: "1S" | "2S",
    source: SourceImage
): QuestionsManifestPage {
    return {
        id: pageId,
        type: "questions",
        sourceImage: source.name,
        sourceHash: source.sha256,
        secondaryTitle: UNIT_TITLES[pageId],
        activeNavbarTitles: activeNavbarTitles(pageId),
        columns: Array.from({ length: 2 }, (_, columnIndex) => ({
            label: textField(
                `genetics.${pageId}.column.${columnIndex + 1}.label`
            ),
            questions: Array.from({ length: 2 }, (_, questionIndex) => ({
                title: textField(
                    `genetics.${pageId}.column.${columnIndex + 1}.question.${questionIndex + 1}.title`
                ),
                question: {
                    key: `genetics.${pageId}.column.${columnIndex + 1}.question.${questionIndex + 1}`,
                    type: "TEXT" as const,
                    content: "",
                },
            })),
        })),
        approvals: {},
    };
}

function createOverviewPage(source: SourceImage): OverviewManifestPage {
    return {
        id: "F",
        type: "overview",
        sourceImage: source.name,
        sourceHash: source.sha256,
        secondaryTitle: UNIT_TITLES.F,
        activeNavbarTitles: [],
        headers: Array.from({ length: 3 }, (_, index) =>
            textField(`genetics.F.header.${index + 1}`)
        ),
        rows: Array.from({ length: 6 }, (_, rowIndex) =>
            Array.from({ length: 3 }, (_, columnIndex) =>
                textField(
                    `genetics.F.row.${rowIndex + 1}.column.${columnIndex + 1}`
                )
            )
        ),
        approvals: {},
    };
}

export function expectedSourceNames(): string[] {
    return [
        "TA.jpg",
        "TB.jpg",
        "TC.jpg",
        ...Array.from({ length: 8 }, (_, index) =>
            ["A", "B", "C"].map((suffix) => `${index + 1}${suffix}.jpg`)
        ).flat(),
        "1S.jpg",
        "2S.jpg",
        "F.jpg",
    ];
}

export function buildDraftManifest(input: {
    archiveName: string;
    archiveSha256: string;
    files: SourceImage[];
}): GeneticsManifest {
    const filesByName = new Map<string, SourceImage>();
    for (const file of input.files) {
        if (filesByName.has(file.name)) {
            throw new Error(`duplicate source image ${file.name}`);
        }
        filesByName.set(file.name, file);
    }

    for (const name of expectedSourceNames()) {
        const file = filesByName.get(name);
        if (!file) throw new Error(`missing ${name}`);
        if (file.width !== 1920 || file.height !== 1080) {
            throw new Error(`${name} must be 1920x1080`);
        }
    }

    const units: CourseUnit[] = UNIT_ORDER.map((id, order) => {
        let pages: ManifestPage[];
        if (id === "1S" || id === "2S") {
            pages = [createQuestionsPage(id, filesByName.get(`${id}.jpg`)!)];
        } else if (id === "F") {
            pages = [createOverviewPage(filesByName.get("F.jpg")!)];
        } else {
            pages = ["A", "B", "C"].map((suffix) =>
                createMaterialPage(
                    id,
                    suffix,
                    filesByName.get(`${id}${suffix}.jpg`)!
                )
            );
        }
        return {
            id,
            title: UNIT_TITLES[id],
            category: categoryForUnit(id),
            order,
            pages,
        };
    });

    return {
        version: 1,
        course: {
            id: "genetics",
            title: "生物遺傳機制推理學習",
            unitOrder: [...UNIT_ORDER],
        },
        source: {
            archiveName: input.archiveName,
            archiveSha256: input.archiveSha256,
            imageWidth: 1920,
            imageHeight: 1080,
        },
        units,
    };
}

export function pageApprovalHash(page: ManifestPage): string {
    const { approvals: _approvals, ...content } = page;
    return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

export function manifestHash(manifest: GeneticsManifest): string {
    const withoutApprovals = {
        ...manifest,
        units: manifest.units.map((unit) => ({
            ...unit,
            pages: unit.pages.map(({ approvals: _approvals, ...page }) => page),
        })),
    };
    return createHash("sha256")
        .update(JSON.stringify(withoutApprovals))
        .digest("hex");
}

export function validateManifest(manifest: GeneticsManifest): ValidationResult {
    const errors: string[] = [];
    if (!validateSchema(manifest)) {
        errors.push(
            ...(validateSchema.errors ?? []).map(
                (error) =>
                    `${error.instancePath || "/"} ${error.message ?? "is invalid"}`
            )
        );
    }
    if (manifest.version !== 1) errors.push("unsupported manifest version");
    if (manifest.course.id !== "genetics")
        errors.push("course id must be genetics");
    if (
        JSON.stringify(manifest.course.unitOrder) !== JSON.stringify(UNIT_ORDER)
    ) {
        errors.push("unit order does not match the Genetics Course contract");
    }

    const pages = manifest.units.flatMap((unit) => unit.pages);
    if (pages.length !== 30) errors.push("manifest must contain 30 pages");
    const pageIds = pages.map((page) => page.id);
    if (new Set(pageIds).size !== pageIds.length) {
        errors.push("page ids must be unique");
    }
    if (
        manifest.source.imageWidth !== 1920 ||
        manifest.source.imageHeight !== 1080
    ) {
        errors.push("source dimensions must be 1920x1080");
    }

    return { valid: errors.length === 0, errors };
}
