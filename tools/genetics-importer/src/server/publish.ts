import { createHash } from "node:crypto";

import { manifestHash, pageApprovalHash } from "./manifest";
import type {
    GeneticsManifest,
    ManifestPage,
    PublishState,
    QuestionField,
    ResourceKind,
    TextField,
} from "../shared/types";

export type PublishResource = {
    key: string;
    kind: ResourceKind;
    contentHash: string;
    payload:
        | { content: string }
        | {
              type: "CHOICE" | "TEXT";
              content: string;
              options?: { label: string; content: string }[];
          }
        | { pageId: string; imageHash: string };
};

export type PublishReadiness = {
    ready: boolean;
    errors: string[];
};

function hash(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function textResource(field: TextField): PublishResource {
    const payload = { content: field.text };
    return {
        key: field.key,
        kind: "text",
        payload,
        contentHash: hash(payload),
    };
}

function questionResource(field: QuestionField): PublishResource {
    const payload = {
        type: field.type,
        content: field.content,
        ...(field.type === "CHOICE" ? { options: field.options ?? [] } : {}),
    };
    return {
        key: field.key,
        kind: "question",
        payload,
        contentHash: hash(payload),
    };
}

function resourcesForPage(page: ManifestPage): PublishResource[] {
    switch (page.type) {
        case "material":
            return [
                ...(page.image
                    ? [
                          {
                              key: page.imageKey,
                              kind: "media" as const,
                              payload: {
                                  pageId: page.id,
                                  imageHash: page.image.sha256,
                              },
                              contentHash: hash({
                                  imageHash: page.image.sha256,
                              }),
                          },
                      ]
                    : []),
                textResource(page.description),
                ...page.questionSections.flatMap((section) => [
                    textResource(section.title),
                    questionResource(section.question),
                ]),
            ];
        case "questions":
            return page.columns.flatMap((column) => [
                textResource(column.label),
                ...column.questions.flatMap((question) => [
                    textResource(question.title),
                    questionResource(question.question),
                ]),
            ]);
        case "overview":
            return [...page.headers, ...page.rows.flat()].map(textResource);
    }
}

export function collectResources(
    manifest: GeneticsManifest
): PublishResource[] {
    const resources = manifest.units.flatMap((unit) =>
        unit.pages.flatMap(resourcesForPage)
    );
    const seen = new Set<string>();
    for (const resource of resources) {
        if (seen.has(resource.key)) {
            throw new Error(`duplicate semantic key ${resource.key}`);
        }
        seen.add(resource.key);
    }
    return resources;
}

function validateText(field: TextField, errors: string[]): void {
    const length = field.text.trim().length;
    if (length === 0) errors.push(`${field.key} is empty`);
    if (length > 2000) errors.push(`${field.key} exceeds 2000 characters`);
}

function validateQuestion(field: QuestionField, errors: string[]): void {
    if (!field.tag.trim()) errors.push(`${field.key} requires a question tag`);
    const length = field.content.trim().length;
    if (length === 0) errors.push(`${field.key} is empty`);
    if (length > 2000) errors.push(`${field.key} exceeds 2000 characters`);
    if (field.type !== "CHOICE") return;
    if (!field.options?.length) errors.push(`${field.key} requires options`);
    const labels = new Set<string>();
    for (const option of field.options ?? []) {
        if (!option.label || option.label.length > 5) {
            errors.push(`${field.key} has an invalid option label`);
        }
        if (!option.content || option.content.length > 1024) {
            errors.push(`${field.key} has invalid option content`);
        }
        if (labels.has(option.label)) {
            errors.push(
                `${field.key} has duplicate option label ${option.label}`
            );
        }
        labels.add(option.label);
    }
}

function validatePageContent(page: ManifestPage, errors: string[]): void {
    switch (page.type) {
        case "material":
            if (!page.image)
                errors.push(`${page.id} requires an uploaded image`);
            validateText(page.description, errors);
            for (const section of page.questionSections) {
                validateText(section.title, errors);
                validateQuestion(section.question, errors);
            }
            break;
        case "questions":
            for (const column of page.columns) {
                validateText(column.label, errors);
                for (const item of column.questions) {
                    validateText(item.title, errors);
                    validateQuestion(item.question, errors);
                }
            }
            break;
        case "overview":
            for (const field of [...page.headers, ...page.rows.flat()]) {
                validateText(field, errors);
            }
            break;
    }
}

export function validatePublishReadiness(
    manifest: GeneticsManifest
): PublishReadiness {
    const errors: string[] = [];
    for (const page of manifest.units.flatMap((unit) => unit.pages)) {
        const currentHash = pageApprovalHash(page);
        if (!page.approvals.content) {
            errors.push(`${page.id} requires content approval`);
        } else if (page.approvals.content.approvalHash !== currentHash) {
            errors.push(`${page.id} content approval is stale`);
        }
        if (!page.approvals.frontend) {
            errors.push(`${page.id} requires frontend approval`);
        } else if (page.approvals.frontend.approvalHash !== currentHash) {
            errors.push(`${page.id} frontend approval is stale`);
        }
        validatePageContent(page, errors);
    }
    collectResources(manifest);
    return { ready: errors.length === 0, errors };
}

export function planPublish(
    manifest: GeneticsManifest,
    state?: PublishState
): {
    manifestHash: string;
    reuse: PublishResource[];
    create: PublishResource[];
} {
    const resources = collectResources(manifest);
    const reuse: PublishResource[] = [];
    const create: PublishResource[] = [];
    for (const resource of resources) {
        const existing = state?.resources[resource.key];
        if (
            existing?.status === "verified" &&
            existing.kind === resource.kind &&
            existing.contentHash === resource.contentHash
        ) {
            reuse.push(resource);
        } else {
            create.push(resource);
        }
    }
    return { manifestHash: manifestHash(manifest), reuse, create };
}
