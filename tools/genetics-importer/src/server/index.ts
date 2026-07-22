import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import express from "express";
import multer from "multer";
import { createServer as createViteServer } from "vite";

import { applyExport, previewExport } from "./exporter";
import {
    buildManualManifest,
    manifestHash,
    pageApprovalHash,
    validateManifest,
} from "./manifest";
import { saveUploadedImage } from "./image";
import {
    collectResources,
    planPublish,
    validatePublishReadiness,
} from "./publish";
import {
    loadManifest,
    loadPublishState,
    saveManifest,
    savePublishState,
} from "./workspace";
import type {
    GeneticsManifest,
    ManifestPage,
    PublishState,
    PublishedResource,
} from "../shared/types";

const toolRoot = resolve(import.meta.dirname, "../..");
const dataRoot = resolve(
    process.env.GENETICS_IMPORTER_DATA_DIR ?? join(toolRoot, ".data")
);
const isDev = process.argv.includes("--dev");
const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
});

app.use(express.json({ limit: "20mb" }));

function asyncRoute(
    handler: (
        request: express.Request,
        response: express.Response
    ) => Promise<void>
): express.RequestHandler {
    return (request, response, next) => {
        handler(request, response).catch(next);
    };
}

async function requireManifest(): Promise<GeneticsManifest> {
    const manifest = await loadManifest(dataRoot);
    if (!manifest)
        throw new Error("create a manual Genetics Course draft first");
    const validation = validateManifest(manifest);
    if (!validation.valid) {
        throw new Error(
            `reset the incompatible draft: ${validation.errors.join("; ")}`
        );
    }
    return manifest;
}

function findPage(manifest: GeneticsManifest, id: string): ManifestPage {
    const page = manifest.units
        .flatMap((unit) => unit.pages)
        .find((item) => item.id === id);
    if (!page) throw new Error(`unknown page ${id}`);
    return page;
}

app.get(
    "/api/workspace",
    asyncRoute(async (_request, response) => {
        const manifest = await loadManifest(dataRoot);
        const validation = manifest ? validateManifest(manifest) : undefined;
        response.json({
            manifest,
            validation,
            readiness:
                manifest && validation?.valid
                    ? validatePublishReadiness(manifest)
                    : undefined,
            states: {
                local: await loadPublishState(dataRoot, "local"),
                dev: await loadPublishState(dataRoot, "dev"),
            },
        });
    })
);

app.post(
    "/api/manifest/reset",
    asyncRoute(async (request, response) => {
        if (request.body.confirmation !== "RESET MANUAL DRAFT") {
            throw new Error("confirmation must be RESET MANUAL DRAFT");
        }
        const manifest = buildManualManifest();
        await saveManifest(dataRoot, manifest);
        response
            .status(201)
            .json({ manifest, readiness: validatePublishReadiness(manifest) });
    })
);

app.post(
    "/api/pages/:id/image",
    upload.single("image"),
    asyncRoute(async (request, response) => {
        if (!request.file) throw new Error("a pre-cropped JPG is required");
        const manifest = await requireManifest();
        const page = findPage(manifest, String(request.params.id));
        if (page.type !== "material") {
            throw new Error("only material pages accept an image");
        }
        page.image = await saveUploadedImage(
            dataRoot,
            page.id,
            request.file.buffer
        );
        page.approvals = {};
        await saveManifest(dataRoot, manifest);
        response
            .status(201)
            .json({ page, readiness: validatePublishReadiness(manifest) });
    })
);

app.put(
    "/api/pages/:id",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const pageId = String(request.params.id);
        const existing = findPage(manifest, pageId);
        const replacement = request.body as ManifestPage;
        if (
            replacement.id !== existing.id ||
            replacement.type !== existing.type
        ) {
            throw new Error("page id and type cannot be changed");
        }
        if (replacement.type === "material" && existing.type === "material") {
            replacement.image = existing.image;
            replacement.imageKey = existing.imageKey;
        }
        replacement.approvals = {};
        const unit = manifest.units.find((item) =>
            item.pages.includes(existing)
        )!;
        unit.pages[unit.pages.indexOf(existing)] = replacement;
        await saveManifest(dataRoot, manifest);
        response.json({
            page: replacement,
            approvalHash: pageApprovalHash(replacement),
        });
    })
);

app.post(
    "/api/pages/:id/approve",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const page = findPage(manifest, String(request.params.id));
        const role = request.body.role as "content" | "frontend";
        const reviewer = String(request.body.reviewer ?? "").trim();
        if (!reviewer) throw new Error("reviewer is required");
        if (role !== "content" && role !== "frontend")
            throw new Error("invalid role");
        page.approvals[role] = {
            reviewer,
            reviewedAt: new Date().toISOString(),
            approvalHash: pageApprovalHash(page),
        };
        await saveManifest(dataRoot, manifest);
        response.json({ page, readiness: validatePublishReadiness(manifest) });
    })
);

app.get(
    "/api/publish/plan",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const environment =
            request.query.environment === "local" ? "local" : "dev";
        const baseUrl = String(request.query.baseUrl ?? "").replace(/\/$/, "");
        if (!baseUrl) throw new Error("baseUrl is required");
        const state = await loadPublishState(dataRoot, environment);
        if (state && state.baseUrl !== baseUrl) {
            throw new Error(
                "saved publish state belongs to a different base URL"
            );
        }
        response.json({
            readiness: validatePublishReadiness(manifest),
            plan: planPublish(manifest, state),
            resources: collectResources(manifest),
            state,
        });
    })
);

app.post(
    "/api/publish/checkpoint",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const environment = request.body.environment as "local" | "dev";
        const baseUrl = String(request.body.baseUrl ?? "").replace(/\/$/, "");
        const key = String(request.body.key ?? "");
        const resource = request.body.resource as PublishedResource;
        if (!(["local", "dev"] as const).includes(environment)) {
            throw new Error("invalid environment");
        }
        const expected = collectResources(manifest).find(
            (item) => item.key === key
        );
        if (
            !expected ||
            expected.kind !== resource.kind ||
            expected.contentHash !== resource.contentHash ||
            resource.status !== "verified" ||
            !resource.id
        ) {
            throw new Error("checkpoint does not match the current manifest");
        }
        const state =
            (await loadPublishState(dataRoot, environment)) ??
            ({
                version: 1,
                environment,
                baseUrl,
                manifestHash: manifestHash(manifest),
                resources: {},
            } satisfies PublishState);
        if (state.baseUrl !== baseUrl) throw new Error("base URL mismatch");
        state.resources[key] = resource;
        state.manifestHash = manifestHash(manifest);
        await savePublishState(dataRoot, state);
        response.json({ state });
    })
);

app.post(
    "/api/export/preview",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const environment = request.body.environment as "local" | "dev";
        const state = await loadPublishState(dataRoot, environment);
        if (!state) throw new Error("publish state is missing");
        response.json(
            await previewExport({
                toolRoot,
                dataRoot,
                outputRoot: String(request.body.outputRoot),
                manifest,
                state,
            })
        );
    })
);

app.post(
    "/api/export/apply",
    asyncRoute(async (request, response) => {
        const manifest = await requireManifest();
        const readiness = validatePublishReadiness(manifest);
        if (!readiness.ready)
            throw new Error("manifest is not ready to export");
        const environment = request.body.environment as "local" | "dev";
        const state = await loadPublishState(dataRoot, environment);
        if (!state) throw new Error("publish state is missing");
        response.json(
            await applyExport({
                toolRoot,
                dataRoot,
                outputRoot: String(request.body.outputRoot),
                manifest,
                state,
                confirmation: String(request.body.confirmation),
            })
        );
    })
);

app.get("/api/images/:id.jpg", (request, response) => {
    response.sendFile(
        join(dataRoot, "images", `${String(request.params.id)}.jpg`)
    );
});

if (isDev) {
    const vite = await createViteServer({
        root: toolRoot,
        configFile: join(toolRoot, "vite.config.ts"),
        server: { middlewareMode: true },
        appType: "spa",
    });
    app.use(vite.middlewares);
} else {
    const clientRoot = join(toolRoot, "dist", "client");
    if (!existsSync(clientRoot)) {
        throw new Error("client build is missing; run pnpm build first");
    }
    app.use(express.static(clientRoot));
    app.get("/{*path}", (_request, response) => {
        response.sendFile(join(clientRoot, "index.html"));
    });
}

app.use(
    (
        error: Error,
        _request: express.Request,
        response: express.Response,
        __next: express.NextFunction
    ) => {
        console.error(error);
        response.status(400).json({ error: error.message });
    }
);

app.listen(3000, "127.0.0.1", () => {
    console.warn(
        `Genetics importer listening on http://127.0.0.1:3000 (${dataRoot})`
    );
});
