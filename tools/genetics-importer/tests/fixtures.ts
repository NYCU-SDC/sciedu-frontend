import { buildManualManifest, pageApprovalHash } from "../src/server/manifest";

export function completeManifest() {
    const manifest = buildManualManifest();
    for (const page of manifest.units.flatMap((unit) => unit.pages)) {
        if (page.type === "material") {
            page.image = {
                fileName: `${page.id}.jpg`,
                sha256: "a".repeat(64),
                width: 1200,
                height: 700,
            };
            page.description.text = `${page.id} description`;
            for (const [index, section] of page.questionSections.entries()) {
                section.title.text = `Question ${index + 1}`;
                section.question.tag = "reasoning";
                section.question.content = `${page.id} question ${index + 1}`;
            }
        } else if (page.type === "questions") {
            for (const [columnIndex, column] of page.columns.entries()) {
                column.label.text = `Column ${columnIndex + 1}`;
                for (const [
                    questionIndex,
                    item,
                ] of column.questions.entries()) {
                    item.title.text = `Question ${questionIndex + 1}`;
                    item.question.tag = "integration";
                    item.question.content = `${page.id} question ${questionIndex + 1}`;
                }
            }
        } else {
            page.headers.forEach((field, index) => {
                field.text = `Header ${index + 1}`;
            });
            page.rows.flat().forEach((field, index) => {
                field.text = `Cell ${index + 1}`;
            });
        }
        const approvalHash = pageApprovalHash(page);
        page.approvals = {
            content: {
                reviewer: "Domain Reviewer",
                reviewedAt: "2026-07-22T08:00:00.000Z",
                approvalHash,
            },
            frontend: {
                reviewer: "Frontend Reviewer",
                reviewedAt: "2026-07-22T08:01:00.000Z",
                approvalHash,
            },
        };
    }
    return manifest;
}
