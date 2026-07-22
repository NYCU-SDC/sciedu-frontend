# Genetics Course Builder

This local-only tool lets people author the Genetics Course explicitly. It does
not use OCR and it does not crop images. Authors name pages, enter descriptions
and questions, assign semantic question tags, and upload already-cropped JPG
files. The tool validates the resulting manifest, publishes it through the
existing SciEdu APIs, records returned UUIDs, and exports product-ready files.

The tool remains on the SCIEDU-99 branch and is not merged into the frontend
product.

## Requirements

- Node.js and pnpm versions supported by the frontend repository
- Finished JPG assets cropped outside this tool
- A local or dev Google OAuth session when publishing

## Run

```bash
pnpm install
pnpm --filter @sciedu/genetics-importer dev
```

Open <http://localhost:3000>. Use `localhost`, rather than `127.0.0.1`, because
the backend OAuth return URL is registered for `localhost`.

Local drafts, uploaded images, and publish checkpoints are stored under
`tools/genetics-importer/.data/` and ignored by Git. Set
`GENETICS_IMPORTER_DATA_DIR` to use another location.

## Authoring workflow

1. Choose **Create / reset manual draft** to create the fixed 30-page Genetics
   route skeleton. Resetting replaces the current local draft.
2. Select each page and enter its display name and text fields.
3. On Material pages, upload a final pre-cropped JPG. The tool preserves the
   uploaded bytes and records its dimensions and SHA-256.
4. Enter each question's text, type, options where applicable, and a semantic
   tag such as `observation`, `reasoning`, or `conclusion`. Tags remain manifest
   metadata because the current Question API does not accept them.
5. Save the page. Saving text or uploading a replacement image clears its
   previous approvals.
6. Record content/domain and frontend approval after the page is final.
7. When all blockers are cleared, log in to the selected backend and type
   `PUBLISH local` or `PUBLISH dev`.
8. Enter the SCIEDU-100 worktree path, preview the export, and export the
   approved manifest, images, publish state, and generated UUID mapping.

The browser calls the backend with `credentials: include`. The tool does not
read or save HttpOnly cookies, OAuth tokens, or credentials.

## UUID behavior

Each field has a stable semantic key. Publishing sends media, text, and
questions to the existing APIs and checkpoints the returned UUID after each
successful request. A rerun verifies existing UUIDs and only recreates missing
or changed resources. Question tags are not included in API payloads.

## Validation

```bash
pnpm lint
pnpm --filter @sciedu/genetics-importer test
pnpm --filter @sciedu/genetics-importer typecheck
pnpm --filter @sciedu/genetics-importer build
```

The tool never commits, pushes, or opens a PR. It refuses to overwrite a target
product file that already has uncommitted changes.
