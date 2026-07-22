import { useEffect, useRef, useState } from "react";
import YAML from "yaml";

import type {
    GeneticsManifest,
    ManifestPage,
    MaterialManifestPage,
    PublishState,
    PublishedResource,
} from "../shared/types";
import type { PublishResource } from "../server/publish";

type Workspace = {
    manifest?: GeneticsManifest;
    validation?: { valid: boolean; errors: string[] };
    readiness?: { ready: boolean; errors: string[] };
    states: { local?: PublishState; dev?: PublishState };
};

type PublishPlanResponse = {
    readiness: { ready: boolean; errors: string[] };
    resources: PublishResource[];
    state?: PublishState;
};

const TOOL_ORIGIN = "http://localhost:3000";

async function localApi<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(path, init);
    const body = await response.json().catch(() => undefined);
    if (!response.ok)
        throw new Error(
            body?.error ?? `${response.status} ${response.statusText}`
        );
    return body as T;
}

function findPage(
    manifest: GeneticsManifest | undefined,
    id: string
): ManifestPage | undefined {
    return manifest?.units
        .flatMap((unit) => unit.pages)
        .find((page) => page.id === id);
}

function endpointFor(kind: PublishResource["kind"], id: string): string {
    if (kind === "question") return `/api/questions/${id}`;
    return `/api/content/${kind}/${id}`;
}

function CropEditor({
    page,
    onChange,
}: {
    page: MaterialManifestPage;
    onChange: (page: MaterialManifestPage) => void;
}) {
    const frameRef = useRef<HTMLDivElement>(null);
    const gesture = useRef<
        | {
              mode: "move" | "resize";
              startX: number;
              startY: number;
              crop: MaterialManifestPage["crop"];
          }
        | undefined
    >(undefined);

    useEffect(() => {
        const move = (event: PointerEvent) => {
            const active = gesture.current;
            const frame = frameRef.current;
            if (!active || !frame) return;
            const rect = frame.getBoundingClientRect();
            const dx = (event.clientX - active.startX) / rect.width;
            const dy = (event.clientY - active.startY) / rect.height;
            const crop = { ...active.crop };
            if (active.mode === "move") {
                crop.x = Math.max(
                    0,
                    Math.min(1 - crop.width, active.crop.x + dx)
                );
                crop.y = Math.max(
                    0,
                    Math.min(1 - crop.height, active.crop.y + dy)
                );
            } else {
                crop.width = Math.max(
                    0.02,
                    Math.min(1 - crop.x, active.crop.width + dx)
                );
                crop.height = Math.max(
                    0.02,
                    Math.min(1 - crop.y, active.crop.height + dy)
                );
            }
            onChange({ ...page, crop });
        };
        const up = () => {
            gesture.current = undefined;
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
        };
    }, [onChange, page]);

    const begin = (mode: "move" | "resize", event: React.PointerEvent) => {
        event.preventDefault();
        gesture.current = {
            mode,
            startX: event.clientX,
            startY: event.clientY,
            crop: { ...page.crop },
        };
    };

    return (
        <div className="cropGrid">
            <div className="sourceFrame" ref={frameRef}>
                <img src={`/api/source/${page.sourceImage}`} alt={page.id} />
                <div
                    className="cropBox"
                    style={{
                        left: `${page.crop.x * 100}%`,
                        top: `${page.crop.y * 100}%`,
                        width: `${page.crop.width * 100}%`,
                        height: `${page.crop.height * 100}%`,
                    }}
                    onPointerDown={(event) => begin("move", event)}
                >
                    <button
                        type="button"
                        className="resizeHandle"
                        aria-label="Resize crop"
                        onPointerDown={(event) => begin("resize", event)}
                    />
                </div>
            </div>
            <div>
                <h3>Crop preview</h3>
                <img
                    className="cropPreview"
                    src={`/api/crops/${page.id}.jpg?draft=${JSON.stringify(page.crop)}`}
                    alt={`${page.id} crop`}
                />
                <code>{JSON.stringify(page.crop)}</code>
            </div>
        </div>
    );
}

export default function App() {
    const [workspace, setWorkspace] = useState<Workspace>({ states: {} });
    const [selectedId, setSelectedId] = useState("");
    const [draftPage, setDraftPage] = useState<ManifestPage>();
    const [pageYaml, setPageYaml] = useState("");
    const [reviewer, setReviewer] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [environment, setEnvironment] = useState<"local" | "dev">("dev");
    const [baseUrl, setBaseUrl] = useState("https://dev.sciedu.sdc.nycu.club");
    const [publishConfirmation, setPublishConfirmation] = useState("");
    const [outputRoot, setOutputRoot] = useState("");
    const [exportPreview, setExportPreview] = useState<{
        files: { path: string; status: string }[];
    }>();

    const selectPage = (page: ManifestPage | undefined) => {
        if (!page) return;
        const copy = structuredClone(page);
        setSelectedId(copy.id);
        setDraftPage(copy);
        setPageYaml(YAML.stringify(copy));
    };

    const refresh = async () => {
        const next = await localApi<Workspace>("/api/workspace");
        setWorkspace(next);
        const nextPage =
            findPage(next.manifest, selectedId) ??
            next.manifest?.units[0]?.pages[0];
        selectPage(nextPage);
    };

    useEffect(() => {
        localApi<Workspace>("/api/workspace")
            .then((next) => {
                setWorkspace(next);
                const firstPage = next.manifest?.units[0]?.pages[0];
                if (!firstPage) return;
                const copy = structuredClone(firstPage);
                setSelectedId(copy.id);
                setDraftPage(copy);
                setPageYaml(YAML.stringify(copy));
            })
            .catch((error) => setMessage(error.message));
    }, []);

    const updateDraft = (page: ManifestPage) => {
        setDraftPage(page);
        setPageYaml(YAML.stringify(page));
    };

    const importArchive = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const input = event.currentTarget.elements.namedItem(
            "archive"
        ) as HTMLInputElement;
        if (!input.files?.[0]) return;
        if (
            !window.confirm(
                "Importing replaces the current local draft workspace. Continue?"
            )
        )
            return;
        setBusy(true);
        setMessage("Running image validation and Apple Vision OCR…");
        try {
            const body = new FormData();
            body.append("archive", input.files[0]);
            await localApi("/api/import", { method: "POST", body });
            setSelectedId("");
            await refresh();
            setMessage("Draft created. Review every field before approval.");
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const savePage = async () => {
        setBusy(true);
        try {
            const parsed = YAML.parse(pageYaml) as ManifestPage;
            await localApi(`/api/pages/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsed),
            });
            await refresh();
            setMessage(`${selectedId} saved; previous approvals were cleared.`);
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const approve = async (role: "content" | "frontend") => {
        try {
            await localApi(`/api/pages/${selectedId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role, reviewer }),
            });
            await refresh();
            setMessage(`${selectedId} received ${role} approval.`);
        } catch (error) {
            setMessage((error as Error).message);
        }
    };

    const checkSession = async () => {
        try {
            const response = await fetch(`${baseUrl}/api/auth/session`, {
                credentials: "include",
            });
            if (!response.ok)
                throw new Error(`${response.status} ${response.statusText}`);
            setMessage(
                `Authenticated session: ${JSON.stringify(await response.json())}`
            );
        } catch (error) {
            setMessage(`Session check failed: ${(error as Error).message}`);
        }
    };

    const createRemoteResource = async (
        resource: PublishResource
    ): Promise<string> => {
        let response: Response;
        if (resource.kind === "media") {
            const pageId = (resource.payload as { pageId: string }).pageId;
            const image = await fetch(`/api/crops/${pageId}.jpg`).then((item) =>
                item.blob()
            );
            const body = new FormData();
            body.append("content", image, `${pageId}.jpg`);
            response = await fetch(`${baseUrl}/api/content/media`, {
                method: "POST",
                credentials: "include",
                body,
            });
        } else {
            const path =
                resource.kind === "text"
                    ? "/api/content/text"
                    : "/api/questions";
            response = await fetch(`${baseUrl}${path}`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(resource.payload),
            });
        }
        const body = await response.json().catch(() => undefined);
        if (!response.ok || !body?.id) {
            throw new Error(
                `${resource.key}: ${body?.detail ?? body?.error ?? response.statusText}`
            );
        }
        return String(body.id);
    };

    const publish = async () => {
        if (publishConfirmation !== `PUBLISH ${environment}`) {
            setMessage(`Type PUBLISH ${environment} before publishing.`);
            return;
        }
        setBusy(true);
        try {
            const query = new URLSearchParams({ environment, baseUrl });
            const result = await localApi<PublishPlanResponse>(
                `/api/publish/plan?${query}`
            );
            if (!result.readiness.ready) {
                throw new Error(
                    `Manifest is not ready:\n${result.readiness.errors.join("\n")}`
                );
            }
            for (const resource of result.resources) {
                const existing = result.state?.resources[resource.key];
                let id: string | undefined;
                if (
                    existing?.status === "verified" &&
                    existing.contentHash === resource.contentHash
                ) {
                    const check = await fetch(
                        `${baseUrl}${endpointFor(resource.kind, existing.id)}`,
                        {
                            credentials: "include",
                        }
                    );
                    if (check.ok) id = existing.id;
                }
                if (!id) id = await createRemoteResource(resource);
                const checkpoint: PublishedResource = {
                    kind: resource.kind,
                    id,
                    contentHash: resource.contentHash,
                    status: "verified",
                    createdAt: new Date().toISOString(),
                };
                await localApi("/api/publish/checkpoint", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        environment,
                        baseUrl,
                        key: resource.key,
                        resource: checkpoint,
                    }),
                });
                setMessage(`Verified ${resource.key}`);
            }
            await refresh();
            setMessage(
                "Publishing complete. Preview the product worktree export next."
            );
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const preview = async () => {
        try {
            const result = await localApi<{
                files: { path: string; status: string }[];
            }>("/api/export/preview", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ environment, outputRoot }),
            });
            setExportPreview(result);
        } catch (error) {
            setMessage((error as Error).message);
        }
    };

    const applyExport = async () => {
        try {
            const result = await localApi<{ written: string[] }>(
                "/api/export/apply",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        environment,
                        outputRoot,
                        confirmation: `EXPORT ${environment}`,
                    }),
                }
            );
            setMessage(
                `Wrote ${result.written.length} approved product files.`
            );
        } catch (error) {
            setMessage((error as Error).message);
        }
    };

    const pages = workspace.manifest?.units.flatMap((unit) => unit.pages) ?? [];

    return (
        <main>
            <header>
                <div>
                    <p className="eyebrow">SCIEDU-99 · local-only tool</p>
                    <h1>Genetics Course Importer</h1>
                    <p>
                        OCR produces a draft. Human review is mandatory before
                        publishing.
                    </p>
                </div>
                <form onSubmit={importArchive} className="importForm">
                    <input name="archive" type="file" accept=".zip" required />
                    <button disabled={busy}>Import ZIP and run OCR</button>
                </form>
            </header>

            {message && <pre className="message">{message}</pre>}

            <section className="statusRow">
                <div>
                    <strong>{pages.length}</strong>
                    <span>pages</span>
                </div>
                <div>
                    <strong>
                        {pages.filter((page) => page.approvals.content).length}
                    </strong>
                    <span>content approvals</span>
                </div>
                <div>
                    <strong>
                        {pages.filter((page) => page.approvals.frontend).length}
                    </strong>
                    <span>frontend approvals</span>
                </div>
                <div
                    className={workspace.readiness?.ready ? "ready" : "blocked"}
                >
                    <strong>
                        {workspace.readiness?.ready ? "Ready" : "Blocked"}
                    </strong>
                    <span>publish status</span>
                </div>
            </section>

            {workspace.manifest && (
                <div className="workspace">
                    <aside className="pageList">
                        {workspace.manifest.units.map((unit) => (
                            <div key={unit.id}>
                                <h3>
                                    {unit.id} · {unit.title}
                                </h3>
                                {unit.pages.map((page) => (
                                    <button
                                        key={page.id}
                                        className={
                                            page.id === selectedId
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() => selectPage(page)}
                                    >
                                        {page.id}
                                        <span>
                                            {page.approvals.content
                                                ? "C✓"
                                                : "C–"}{" "}
                                            {page.approvals.frontend
                                                ? "F✓"
                                                : "F–"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </aside>

                    <section className="editor">
                        {draftPage && (
                            <>
                                <div className="editorTitle">
                                    <div>
                                        <p className="eyebrow">
                                            {draftPage.type}
                                        </p>
                                        <h2>
                                            {draftPage.id} ·{" "}
                                            {draftPage.secondaryTitle}
                                        </h2>
                                    </div>
                                    <div className="approvalActions">
                                        <input
                                            value={reviewer}
                                            onChange={(event) =>
                                                setReviewer(event.target.value)
                                            }
                                            placeholder="Reviewer name"
                                        />
                                        <button
                                            onClick={() => approve("content")}
                                        >
                                            Approve content
                                        </button>
                                        <button
                                            onClick={() => approve("frontend")}
                                        >
                                            Approve frontend
                                        </button>
                                    </div>
                                </div>

                                {draftPage.type === "material" && (
                                    <CropEditor
                                        page={draftPage}
                                        onChange={updateDraft}
                                    />
                                )}
                                {draftPage.type !== "material" && (
                                    <img
                                        className="fullSource"
                                        src={`/api/source/${draftPage.sourceImage}`}
                                        alt={draftPage.id}
                                    />
                                )}

                                <div className="ocrNotice">
                                    OCR observations:{" "}
                                    {draftPage.ocrDraft?.length ?? 0};
                                    low-confidence:{" "}
                                    {draftPage.ocrDraft?.filter(
                                        (item) => item.confidence < 0.7
                                    ).length ?? 0}
                                </div>
                                <label className="yamlEditor">
                                    <span>
                                        Page YAML — verify every field before
                                        saving
                                    </span>
                                    <textarea
                                        value={pageYaml}
                                        onChange={(event) =>
                                            setPageYaml(event.target.value)
                                        }
                                        spellCheck={false}
                                    />
                                </label>
                                <button onClick={savePage} disabled={busy}>
                                    Save page and clear approvals
                                </button>
                            </>
                        )}
                    </section>
                </div>
            )}

            <section className="publishPanel">
                <h2>Publish and export</h2>
                <div className="formGrid">
                    <label>
                        Environment
                        <select
                            value={environment}
                            onChange={(event) => {
                                const value = event.target.value as
                                    | "local"
                                    | "dev";
                                setEnvironment(value);
                                setBaseUrl(
                                    value === "dev"
                                        ? "https://dev.sciedu.sdc.nycu.club"
                                        : "http://localhost:8080"
                                );
                            }}
                        >
                            <option value="dev">dev</option>
                            <option value="local">local</option>
                        </select>
                    </label>
                    <label>
                        Backend base URL
                        <input
                            value={baseUrl}
                            onChange={(event) => setBaseUrl(event.target.value)}
                        />
                    </label>
                    <label>
                        Confirmation
                        <input
                            value={publishConfirmation}
                            onChange={(event) =>
                                setPublishConfirmation(event.target.value)
                            }
                            placeholder={`PUBLISH ${environment}`}
                        />
                    </label>
                    <label>
                        Product worktree
                        <input
                            value={outputRoot}
                            onChange={(event) =>
                                setOutputRoot(event.target.value)
                            }
                            placeholder="/absolute/path/to/product-worktree"
                        />
                    </label>
                </div>
                <div className="buttonRow">
                    <a
                        className="buttonLink"
                        href={`${baseUrl}/api/login/oauth/google?r=${encodeURIComponent(TOOL_ORIGIN)}`}
                    >
                        Google OAuth login
                    </a>
                    <button onClick={checkSession}>Check session</button>
                    <button
                        className="danger"
                        onClick={publish}
                        disabled={busy || !workspace.readiness?.ready}
                    >
                        Publish {environment}
                    </button>
                    <button onClick={preview}>Preview export</button>
                    <button onClick={applyExport} disabled={!exportPreview}>
                        Export approved files
                    </button>
                </div>
                {exportPreview && (
                    <pre>
                        {exportPreview.files
                            .map(
                                (file) =>
                                    `${file.status.padEnd(9)} ${file.path}`
                            )
                            .join("\n")}
                    </pre>
                )}
                {!workspace.readiness?.ready && workspace.readiness && (
                    <details>
                        <summary>
                            {workspace.readiness.errors.length} blockers
                        </summary>
                        <pre>{workspace.readiness.errors.join("\n")}</pre>
                    </details>
                )}
            </section>
        </main>
    );
}
