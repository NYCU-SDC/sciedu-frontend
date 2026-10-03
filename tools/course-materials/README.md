# Brain–computer interface and dire-wolf course materials

The two JSON manifests contain **eight material pages** extracted from the
approved PowerPoint decks. Each consecutive group of three slides becomes one
page: the first slide supplies editable lesson text, question(s), and figures;
the second repeats the lesson text; the third supplies figure descriptions.
The images in `assets/` are the original embedded picture bytes, not full-slide
screenshots, so slide backgrounds and red question boxes are excluded.

| Course                   | Pages | Questions | Images |
| ------------------------ | ----: | --------: | -----: |
| Brain–computer interface |     4 |         5 |      9 |
| Dire-wolf revival        |     4 |         4 |      6 |

`description` belongs in the large text box under the main image gallery.
`questions` belong below it. `imageDescriptionForLLM` is the exact editable
description from the group's third slide (apart from doubled full-stop cleanup).
It is machine-readable metadata, **not student-facing lesson text**. It covers
all images for the page in their manifest order. Retain it as a separate TEXT
resource/PageBlock when uploading so a later course-aware chat integration can
retrieve it. The current chat API does not yet load page context automatically.

The Course Player on the SCIEDU-134 branch expects these PageBlock positions:

- `0`: TEXT lesson description
- `10`, `20`, …: MEDIA in `images` order
- `100`, `110`, …: TEXT question labels; each followed by a QUESTION at `+1`
- `200`: TEXT `imageDescriptionForLLM`, `required: false` (ignored by the
  student-facing Course Player; reserved for course-aware LLM context)

Do not treat the `200` block as connected to the LLM until the backend chat
service explicitly retrieves it for the active course/page.

## API upload (SCIEDU-136)

Preview the exact PageBlock plan without network access:

```bash
python3 tools/course-materials/publish.py
python3 -m unittest tools/course-materials/test_publish.py
```

When an authenticated SciEdu backend is available, upload through its API:

```bash
python3 tools/course-materials/publish.py --publish --api-base https://YOUR-DEV-BACKEND
```

The command prompts for an authenticated `Cookie` header, so it is not exposed
in shell history or saved in the repo. Use an EXPERIMENTER or ADMIN session.
It creates both courses as **DRAFT**; it does not assign them to an experiment
or publish them to students. Returned UUIDs are checkpointed in ignored
`.data/upload-state.json`, and rerunning the same command verifies and reuses
the resources. Use `--state /private/path/state.json` for a different backend.
Do not delete the checkpoint mid-upload: the APIs do not provide a transaction
across all resources, so a rerun without it could duplicate content.

This importer stores each third-slide description in a separate TEXT content
resource and a `displayOrder: 200` PageBlock. The Course Player intentionally
ignores that block; a backend course-aware chat change is still needed before
the LLM actually consumes it.

Regenerate from the original supplied PPTX files:

```bash
python3 tools/course-materials/extract_decks.py \
  '/path/to/恐狼復育V12-20260821 ok.pptx' \
  '/path/to/腦機介面V12-20260819ok.pptx'
python3 tools/course-materials/validate.py
pnpm exec prettier 'tools/course-materials/*.json' --write
```

The source decks themselves are not committed. The extractor deliberately
normalizes accidental `。。` to `。`, but otherwise preserves the slide text,
including the source's repeated question number `3` in BCI page `1-3`.
