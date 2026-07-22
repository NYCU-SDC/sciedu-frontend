# Genetics Course Importer

This macOS-only tool prepares the Genetics Course source archive, runs Apple
Vision OCR locally, lets two reviewers approve each page, publishes approved
resources through the existing SciEdu APIs, and generates product-ready UUID
mappings. The tool is intentionally kept on the SCIEDU-99 branch and is not
merged into the frontend product.

## Requirements

- macOS with Xcode command-line tools (`xcrun swiftc`)
- Node.js and pnpm versions supported by the frontend repository
- A Genetics Course ZIP containing the expected 30 JPG files at 1920x1080
- A local or dev Google OAuth session

## Run

```bash
pnpm install
pnpm --filter @sciedu/genetics-importer build
pnpm --filter @sciedu/genetics-importer start
```

Open <http://localhost:3000>. The server binds only to `127.0.0.1`; use the
`localhost` URL because it is the OAuth return URL registered by the backend.

For development with Vite middleware:

```bash
pnpm --filter @sciedu/genetics-importer dev
```

Local workspace data is stored under `tools/genetics-importer/.data/` and is
ignored by Git. Set `GENETICS_IMPORTER_DATA_DIR` to use another location.

## Workflow

1. Import the original ZIP. Importing replaces the current local draft.
2. Review the OCR draft for every page. OCR text is never automatically
   approved.
3. Drag and resize material crops, edit the page YAML, and save. Saving clears
   both approvals.
4. Record content/domain approval and frontend approval with different review
   responsibilities.
5. Log in to the selected backend and check the session.
6. Type `PUBLISH local` or `PUBLISH dev` and publish. A checkpoint is written
   after every verified resource.
7. Enter the SCIEDU-100 worktree path, preview the file list, then export. The
   exporter refuses to overwrite modified target files.

The browser calls the backend directly with `credentials: include`; the tool
never reads or stores HttpOnly cookies or OAuth tokens.

## Validation

```bash
pnpm --filter @sciedu/genetics-importer test
pnpm --filter @sciedu/genetics-importer typecheck
pnpm --filter @sciedu/genetics-importer build
```

The original ZIP is never exported. Only the approved manifest, crop assets,
publish state, schema, and generated TypeScript mapping are written to the
product worktree.
