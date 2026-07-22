import { describe, expect, it } from "vitest";

import { manifestHash } from "../src/server/manifest";
import { renderCourseResource } from "../src/server/generator";
import { collectResources } from "../src/server/publish";
import type { PublishState } from "../src/shared/types";
import { completeManifest } from "./fixtures";

function stateForCompleteManifest(): {
    state: PublishState;
    manifest: ReturnType<typeof completeManifest>;
} {
    const manifest = completeManifest();
    const resources = collectResources(manifest);
    return {
        manifest,
        state: {
            version: 1,
            environment: "dev",
            baseUrl: "https://dev.sciedu.sdc.nycu.club",
            manifestHash: manifestHash(manifest),
            resources: Object.fromEntries(
                resources.map((resource, index) => [
                    resource.key,
                    {
                        kind: resource.kind,
                        id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
                        contentHash: resource.contentHash,
                        status: "verified" as const,
                        createdAt: "2026-07-22T08:00:00.000Z",
                    },
                ])
            ),
        },
    };
}

describe("frontend course resource generation", () => {
    it("renders every unit using verified UUID mappings", () => {
        const { manifest, state } = stateForCompleteManifest();
        const output = renderCourseResource(manifest, state);

        expect(output).toContain("export const courseUnits: CourseUnit[]");
        expect(output).toContain('id: "T"');
        expect(output).toContain('id: "1S"');
        expect(output).toContain('id: "F"');
        expect(output).toContain("00000000-0000-4000-8000-");
    });

    it("refuses to render when a resource is missing", () => {
        const { manifest, state } = stateForCompleteManifest();
        state.resources = {};

        expect(() => renderCourseResource(manifest, state)).toThrow(
            /missing verified resource/
        );
    });
});
