import { describe, expect, it } from "vitest";

import { buildDraftManifest, pageApprovalHash } from "../src/server/manifest";
import {
    collectResources,
    planPublish,
    validatePublishReadiness,
} from "../src/server/publish";
import type { PublishState } from "../src/shared/types";

const sourceFiles = [
    "TA.jpg",
    "TB.jpg",
    "TC.jpg",
    ...Array.from({ length: 8 }, (_, index) =>
        ["A", "B", "C"].map((suffix) => `${index + 1}${suffix}.jpg`)
    ).flat(),
    "1S.jpg",
    "2S.jpg",
    "F.jpg",
].map((name) => ({
    name,
    sha256: `sha-${name}`,
    width: 1920,
    height: 1080,
}));

function draft() {
    return buildDraftManifest({
        archiveName: "Genetics Course.zip",
        archiveSha256: "archive-sha",
        files: sourceFiles,
    });
}

describe("publish planning", () => {
    it("blocks publishing until every page has current dual approval", () => {
        const manifest = draft();
        const firstPage = manifest.units[0].pages[0];
        const approvalHash = pageApprovalHash(firstPage);
        firstPage.approvals = {
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

        const result = validatePublishReadiness(manifest);

        expect(result.ready).toBe(false);
        expect(result.errors).toContain("TB requires content approval");
        expect(result.errors).toContain("TB requires frontend approval");
    });

    it("collects unique resources by semantic key", () => {
        const resources = collectResources(draft());
        const keys = resources.map((resource) => resource.key);

        expect(new Set(keys).size).toBe(keys.length);
        expect(resources).toContainEqual(
            expect.objectContaining({ key: "genetics.TA.image", kind: "media" })
        );
        expect(resources).toContainEqual(
            expect.objectContaining({
                key: "genetics.TA.description",
                kind: "text",
            })
        );
        expect(resources).toContainEqual(
            expect.objectContaining({
                key: "genetics.TA.question.1",
                kind: "question",
            })
        );
    });

    it("reuses verified resources and recreates only stale ones", () => {
        const manifest = draft();
        const resources = collectResources(manifest);
        const [verified, stale] = resources;
        const state: PublishState = {
            version: 1,
            environment: "dev",
            baseUrl: "https://dev.sciedu.sdc.nycu.club",
            manifestHash: "old-manifest",
            resources: {
                [verified.key]: {
                    kind: verified.kind,
                    id: "verified-id",
                    contentHash: verified.contentHash,
                    status: "verified",
                    createdAt: "2026-07-22T08:00:00.000Z",
                },
                [stale.key]: {
                    kind: stale.kind,
                    id: "stale-id",
                    contentHash: "old-content",
                    status: "verified",
                    createdAt: "2026-07-22T08:00:00.000Z",
                },
            },
        };

        const plan = planPublish(manifest, state);

        expect(plan.reuse.map((resource) => resource.key)).toContain(
            verified.key
        );
        expect(plan.create.map((resource) => resource.key)).toContain(
            stale.key
        );
    });
});
