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

function questionField(key: string) {
    return { key, tag: "", type: "TEXT" as const, content: "" };
}

function createMaterialPage(
    unitId: string,
    suffix: string
): MaterialManifestPage {
    const pageId = `${unitId}${suffix}`;
    return {
        id: pageId,
        type: "material",
        secondaryTitle: UNIT_TITLES[unitId],
        activeNavbarTitles: activeNavbarTitles(unitId),
        imageKey: `genetics.${pageId}.image`,
        description: textField(`genetics.${pageId}.description`),
        questionSections: Array.from({ length: 3 }, (_, index) => ({
            title: textField(`genetics.${pageId}.question.${index + 1}.title`),
            question: questionField(`genetics.${pageId}.question.${index + 1}`),
        })),
        approvals: {},
    };
}

function createQuestionsPage(pageId: "1S" | "2S"): QuestionsManifestPage {
    return {
        id: pageId,
        type: "questions",
        secondaryTitle: UNIT_TITLES[pageId],
        activeNavbarTitles: activeNavbarTitles(pageId),
        columns: Array.from({ length: 2 }, (_, columnIndex) => ({
            label: textField(
                `genetics.${pageId}.column.${columnIndex + 1}.label`
            ),
            questions: Array.from({ length: 2 }, (_, questionIndex) => {
                const key = `genetics.${pageId}.column.${columnIndex + 1}.question.${questionIndex + 1}`;
                return {
                    title: textField(`${key}.title`),
                    question: questionField(key),
                };
            }),
        })),
        approvals: {},
    };
}

function createOverviewPage(): OverviewManifestPage {
    return {
        id: "F",
        type: "overview",
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

export function buildManualManifest(): GeneticsManifest {
    const units: CourseUnit[] = UNIT_ORDER.map((id, order) => {
        let pages: ManifestPage[];
        if (id === "1S" || id === "2S") pages = [createQuestionsPage(id)];
        else if (id === "F") pages = [createOverviewPage()];
        else
            pages = ["A", "B", "C"].map((suffix) =>
                createMaterialPage(id, suffix)
            );
        return {
            id,
            title: UNIT_TITLES[id],
            category: categoryForUnit(id),
            order,
            pages,
        };
    });

    return {
        version: 2,
        course: {
            id: "genetics",
            title: "生物遺傳機制推理學習",
            unitOrder: [...UNIT_ORDER],
        },
        authoring: { mode: "manual" },
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
    const version = (manifest as { version?: number }).version;
    if (version !== 2) {
        return {
            valid: false,
            errors: [
                `saved manifest version ${version ?? "unknown"} is incompatible with manual authoring version 2`,
            ],
        };
    }
    if (!validateSchema(manifest)) {
        errors.push(
            ...(validateSchema.errors ?? []).map(
                (error) =>
                    `${error.instancePath || "/"} ${error.message ?? "is invalid"}`
            )
        );
    }
    if (manifest.course.id !== "genetics")
        errors.push("course id must be genetics");
    if (
        JSON.stringify(manifest.course.unitOrder) !== JSON.stringify(UNIT_ORDER)
    ) {
        errors.push("unit order does not match the Genetics Course contract");
    }
    const pages = manifest.units.flatMap((unit) => unit.pages);
    if (pages.length !== 30) errors.push("manifest must contain 30 pages");
    if (new Set(pages.map((page) => page.id)).size !== pages.length) {
        errors.push("page ids must be unique");
    }
    return { valid: errors.length === 0, errors };
}
