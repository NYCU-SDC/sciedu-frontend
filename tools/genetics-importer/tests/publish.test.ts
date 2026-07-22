import { describe, expect, it } from "vitest";

import { buildManualManifest, pageApprovalHash } from "../src/server/manifest";
import {
    collectResources,
    planPublish,
    validatePublishReadiness,
} from "../src/server/publish";
import type { PublishState } from "../src/shared/types";
import { completeManifest } from "./fixtures";

describe("manual publish planning", () => {
    it("blocks missing images, tags, text, and approvals", () => {
        const manifest = buildManualManifest();
        const firstPage = manifest.units[0].pages[0];
        const approvalHash = pageApprovalHash(firstPage);
        firstPage.approvals = {
            content: {
                reviewer: "Domain",
                reviewedAt: "2026-07-22T08:00:00.000Z",
                approvalHash,
            },
            frontend: {
                reviewer: "Frontend",
                reviewedAt: "2026-07-22T08:01:00.000Z",
                approvalHash,
            },
        };

        const result = validatePublishReadiness(manifest);

        expect(result.ready).toBe(false);
        expect(result.errors).toContain("TA requires an uploaded image");
        expect(result.errors).toContain(
            "genetics.TA.question.1 requires a question tag"
        );
        expect(result.errors).toContain("TB requires content approval");
    });

    it("collects media, text, and question resources from completed manual fields", () => {
        const resources = collectResources(completeManifest());
        expect(new Set(resources.map((resource) => resource.key)).size).toBe(
            resources.length
        );
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

    it("keeps tags as manifest metadata instead of sending unsupported API fields", () => {
        const question = collectResources(completeManifest()).find(
            (resource) => resource.key === "genetics.TA.question.1"
        );

        expect(question?.payload).not.toHaveProperty("tag");
    });

    it("reuses verified UUIDs and recreates only stale resources", () => {
        const manifest = completeManifest();
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
