import { useEffect, useState } from "react";

import type { PublishResource } from "../server/publish";
import type {
    GeneticsManifest,
    ManifestPage,
    MaterialManifestPage,
    PublishState,
    PublishedResource,
    QuestionField,
    QuestionsManifestPage,
    OverviewManifestPage,
} from "../shared/types";

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
    return kind === "question"
        ? `/api/questions/${id}`
        : `/api/content/${kind}/${id}`;
}

function QuestionEditor({
    value,
    onChange,
}: {
    value: QuestionField;
    onChange: (value: QuestionField) => void;
}) {
    const options = value.options ?? [];
    return (
        <div className="questionEditor">
            <label>
                Question tag
                <input
                    value={value.tag}
                    placeholder="observation, reasoning, conclusion…"
                    onChange={(event) =>
                        onChange({ ...value, tag: event.target.value })
                    }
                />
            </label>
            <label>
                Question type
                <select
                    value={value.type}
                    onChange={(event) => {
                        const type = event.target
                            .value as QuestionField["type"];
                        onChange({
                            ...value,
                            type,
                            ...(type === "CHOICE"
                                ? { options }
                                : { options: undefined }),
                        });
                    }}
                >
                    <option value="TEXT">Text response</option>
                    <option value="CHOICE">Multiple choice</option>
                </select>
            </label>
            <label className="wideField">
                Question text
                <textarea
                    value={value.content}
                    onChange={(event) =>
                        onChange({ ...value, content: event.target.value })
                    }
                />
            </label>
            {value.type === "CHOICE" && (
                <div className="optionList wideField">
                    <strong>Options</strong>
                    {options.map((option, index) => (
                        <div
                            className="optionRow"
                            key={`${value.key}.option.${index}`}
                        >
                            <input
                                aria-label={`Option ${index + 1} label`}
                                value={option.label}
                                placeholder="A"
                                onChange={(event) => {
                                    const next = [...options];
                                    next[index] = {
                                        ...option,
                                        label: event.target.value,
                                    };
                                    onChange({ ...value, options: next });
                                }}
                            />
                            <input
                                aria-label={`Option ${index + 1} content`}
                                value={option.content}
                                placeholder="Option text"
                                onChange={(event) => {
                                    const next = [...options];
                                    next[index] = {
                                        ...option,
                                        content: event.target.value,
                                    };
                                    onChange({ ...value, options: next });
                                }}
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    onChange({
                                        ...value,
                                        options: options.filter(
                                            (_, optionIndex) =>
                                                optionIndex !== index
                                        ),
                                    })
                                }
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() =>
                            onChange({
                                ...value,
                                options: [
                                    ...options,
                                    {
                                        label: String.fromCharCode(
                                            65 + options.length
                                        ),
                                        content: "",
                                    },
                                ],
                            })
                        }
                    >
                        Add option
                    </button>
                </div>
            )}
        </div>
    );
}

function MaterialEditor({
    page,
    onChange,
    onUpload,
}: {
    page: MaterialManifestPage;
    onChange: (page: MaterialManifestPage) => void;
    onUpload: (file: File) => void;
}) {
    return (
        <>
            <section className="imageUpload">
                <div>
                    <h3>Pre-cropped teaching image</h3>
                    <p>
                        Crop outside this tool, then upload the finished JPG.
                        Uploading clears approvals.
                    </p>
                    <input
                        type="file"
                        accept="image/jpeg,.jpg,.jpeg"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onUpload(file);
                        }}
                    />
                    {page.image && (
                        <code>
                            {page.image.width}×{page.image.height} ·{" "}
                            {page.image.sha256.slice(0, 12)}…
                        </code>
                    )}
                </div>
                {page.image && (
                    <img
                        src={`/api/images/${page.id}.jpg?hash=${page.image.sha256}`}
                        alt="Uploaded teaching material"
                    />
                )}
            </section>
            <label className="wideField">
                Page description
                <textarea
                    value={page.description.text}
                    onChange={(event) =>
                        onChange({
                            ...page,
                            description: {
                                ...page.description,
                                text: event.target.value,
                            },
                        })
                    }
                />
            </label>
            <div className="sectionHeader">
                <h3>Question sections</h3>
                <button
                    type="button"
                    onClick={() => {
                        const number = page.questionSections.length + 1;
                        const key = `genetics.${page.id}.question.${number}`;
                        onChange({
                            ...page,
                            questionSections: [
                                ...page.questionSections,
                                {
                                    title: { key: `${key}.title`, text: "" },
                                    question: {
                                        key,
                                        tag: "",
                                        type: "TEXT",
                                        content: "",
                                    },
                                },
                            ],
                        });
                    }}
                >
                    Add question
                </button>
            </div>
            {page.questionSections.map((section, index) => (
                <article className="contentCard" key={section.question.key}>
                    <div className="sectionHeader">
                        <h4>Question {index + 1}</h4>
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...page,
                                    questionSections:
                                        page.questionSections.filter(
                                            (_, itemIndex) =>
                                                itemIndex !== index
                                        ),
                                })
                            }
                        >
                            Remove
                        </button>
                    </div>
                    <label>
                        Section heading
                        <input
                            value={section.title.text}
                            onChange={(event) => {
                                const next = structuredClone(page);
                                next.questionSections[index].title.text =
                                    event.target.value;
                                onChange(next);
                            }}
                        />
                    </label>
                    <QuestionEditor
                        value={section.question}
                        onChange={(question) => {
                            const next = structuredClone(page);
                            next.questionSections[index].question = question;
                            onChange(next);
                        }}
                    />
                </article>
            ))}
        </>
    );
}

function QuestionsEditor({
    page,
    onChange,
}: {
    page: QuestionsManifestPage;
    onChange: (page: QuestionsManifestPage) => void;
}) {
    return (
        <div className="columnGrid">
            {page.columns.map((column, columnIndex) => (
                <article className="contentCard" key={column.label.key}>
                    <label>
                        Column {columnIndex + 1} label
                        <input
                            value={column.label.text}
                            onChange={(event) => {
                                const next = structuredClone(page);
                                next.columns[columnIndex].label.text =
                                    event.target.value;
                                onChange(next);
                            }}
                        />
                    </label>
                    {column.questions.map((item, questionIndex) => (
                        <div className="nestedQuestion" key={item.question.key}>
                            <label>
                                Question {questionIndex + 1} heading
                                <input
                                    value={item.title.text}
                                    onChange={(event) => {
                                        const next = structuredClone(page);
                                        next.columns[columnIndex].questions[
                                            questionIndex
                                        ].title.text = event.target.value;
                                        onChange(next);
                                    }}
                                />
                            </label>
                            <QuestionEditor
                                value={item.question}
                                onChange={(question) => {
                                    const next = structuredClone(page);
                                    next.columns[columnIndex].questions[
                                        questionIndex
                                    ].question = question;
                                    onChange(next);
                                }}
                            />
                        </div>
                    ))}
                </article>
            ))}
        </div>
    );
}

function OverviewEditor({
    page,
    onChange,
}: {
    page: OverviewManifestPage;
    onChange: (page: OverviewManifestPage) => void;
}) {
    return (
        <div className="overviewEditor">
            <h3>Overview table</h3>
            <div className="overviewRow">
                {page.headers.map((header, index) => (
                    <input
                        key={header.key}
                        aria-label={`Header ${index + 1}`}
                        value={header.text}
                        placeholder={`Header ${index + 1}`}
                        onChange={(event) => {
                            const next = structuredClone(page);
                            next.headers[index].text = event.target.value;
                            onChange(next);
                        }}
                    />
                ))}
            </div>
            {page.rows.map((row, rowIndex) => (
                <div className="overviewRow" key={`row-${rowIndex}`}>
                    {row.map((cell, columnIndex) => (
                        <textarea
                            key={cell.key}
                            aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
                            value={cell.text}
                            onChange={(event) => {
                                const next = structuredClone(page);
                                next.rows[rowIndex][columnIndex].text =
                                    event.target.value;
                                onChange(next);
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default function App() {
    const [workspace, setWorkspace] = useState<Workspace>({ states: {} });
    const [selectedId, setSelectedId] = useState("");
    const [draftPage, setDraftPage] = useState<ManifestPage>();
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
        setSelectedId(page.id);
        setDraftPage(structuredClone(page));
    };

    const applyWorkspace = (next: Workspace, preferredId = selectedId) => {
        setWorkspace(next);
        if (!next.validation?.valid) {
            setDraftPage(undefined);
            return;
        }
        selectPage(
            findPage(next.manifest, preferredId) ??
                next.manifest?.units[0]?.pages[0]
        );
    };

    const refresh = async () =>
        applyWorkspace(await localApi<Workspace>("/api/workspace"));

    useEffect(() => {
        localApi<Workspace>("/api/workspace")
            .then((next) => {
                setWorkspace(next);
                if (!next.validation?.valid) return;
                const firstPage = next.manifest?.units[0]?.pages[0];
                if (firstPage) {
                    setSelectedId(firstPage.id);
                    setDraftPage(structuredClone(firstPage));
                }
            })
            .catch((error) => setMessage(error.message));
    }, []);

    const resetManifest = async () => {
        if (
            !window.confirm(
                "Replace the local draft and clear all page approvals?"
            )
        )
            return;
        setBusy(true);
        try {
            await localApi("/api/manifest/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmation: "RESET MANUAL DRAFT" }),
            });
            setSelectedId("");
            await refresh();
            setMessage(
                "Manual 30-page draft created. Enter content and upload finished JPG files."
            );
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const savePage = async () => {
        if (!draftPage) return;
        setBusy(true);
        try {
            await localApi(`/api/pages/${selectedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draftPage),
            });
            await refresh();
            setMessage(`${selectedId} saved; previous approvals were cleared.`);
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setBusy(false);
        }
    };

    const uploadImage = async (file: File) => {
        setBusy(true);
        try {
            if (draftPage) {
                await localApi(`/api/pages/${selectedId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(draftPage),
                });
            }
            const body = new FormData();
            body.append("image", file);
            await localApi(`/api/pages/${selectedId}/image`, {
                method: "POST",
                body,
            });
            await refresh();
            setMessage(
                `${selectedId} image uploaded; previous approvals were cleared.`
            );
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
            const image = await fetch(`/api/images/${pageId}.jpg`).then(
                (item) => item.blob()
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
            setExportPreview(
                await localApi("/api/export/preview", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ environment, outputRoot }),
                })
            );
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

    const manifest = workspace.validation?.valid
        ? workspace.manifest
        : undefined;
    const pages = manifest?.units.flatMap((unit) => unit.pages) ?? [];

    return (
        <main>
            <header>
                <div>
                    <p className="eyebrow">SCIEDU-99 · manual authoring tool</p>
                    <h1>Genetics Course Builder</h1>
                    <p>
                        People write the content and prepare images; the tool
                        validates, publishes, and records UUIDs.
                    </p>
                </div>
                <button
                    className="secondary"
                    onClick={resetManifest}
                    disabled={busy}
                >
                    Create / reset manual draft
                </button>
            </header>

            {message && <pre className="message">{message}</pre>}
            {workspace.validation && !workspace.validation.valid && (
                <div className="warning">
                    The saved OCR-era draft is incompatible. Create a new manual
                    draft to continue.
                    <pre>{workspace.validation.errors.join("\n")}</pre>
                </div>
            )}

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

            {manifest && (
                <div className="workspace">
                    <aside className="pageList">
                        {manifest.units.map((unit) => (
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
                                            {page.type === "material" &&
                                            !page.image
                                                ? "IMG– "
                                                : ""}
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
                                        <h2>{draftPage.id}</h2>
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
                                <label className="wideField">
                                    Page display name
                                    <input
                                        value={draftPage.secondaryTitle}
                                        onChange={(event) =>
                                            setDraftPage({
                                                ...draftPage,
                                                secondaryTitle:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                </label>
                                {draftPage.type === "material" && (
                                    <MaterialEditor
                                        page={draftPage}
                                        onChange={setDraftPage}
                                        onUpload={uploadImage}
                                    />
                                )}
                                {draftPage.type === "questions" && (
                                    <QuestionsEditor
                                        page={draftPage}
                                        onChange={setDraftPage}
                                    />
                                )}
                                {draftPage.type === "overview" && (
                                    <OverviewEditor
                                        page={draftPage}
                                        onChange={setDraftPage}
                                    />
                                )}
                                <button
                                    className="saveButton"
                                    onClick={savePage}
                                    disabled={busy}
                                >
                                    Save page and clear approvals
                                </button>
                            </>
                        )}
                    </section>
                </div>
            )}

            <section className="publishPanel">
                <h2>Publish and export UUID mapping</h2>
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
