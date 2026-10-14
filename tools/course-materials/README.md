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

Each question has a positive integer `sourceNumber` copied from the deck's
printed label. The BCI sequence is `1, 2, 3, 3, 4`; the dire-wolf sequence is
`1, 2, 3, 4`. Repeated numbers are intentional source data. Keep identity based
on course code, page code, and question index rather than `sourceNumber`.
SCIEDU-136 must use `str(question["sourceNumber"])` for the question-title TEXT
block instead of restarting numbering at `question_index + 1` on every page.
This manifest field does not change the public question API.

The shared Course Player on `main` expects these PageBlock positions:

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

Upload against a backend that implements creation `Idempotency-Key` support
for courses, pages, TEXT, MEDIA, questions and PageBlocks (migration 23).
The uploader checks the echoed key on each successful creation response;
older backends are refused. Preview remains network-free.

```bash
# Pick and retain one UUID for this batch. Reuse it on every restart.
python3 tools/course-materials/publish.py --publish \
  --api-base http://localhost:58081 \
  --upload-id 8a8a4496-ea9c-4c66-a60a-c5cbad0f2011 \
  --state /private/path/sciedu-c2-upload.json
```

The command prompts for an EXPERIMENTER or ADMIN Cookie header. Cookies remain
in memory, including refreshed cookies; they are never written to the state or
command history. API redirects are refused to avoid forwarding credentials.
The tool uses `fcntl` file locking and runs on macOS/Linux with Python 3.9+.

The version-2 checkpoint binds the API origin, authenticated user ID, upload ID
and full material/image fingerprint. It records each operation's deterministic
UUID key and pending state **before** making a request, then records the returned
resource ID only after reading it back and checking its content. File writes
are atomic and synced. A second process cannot use the same state file.

A timeout, lost response, 401 or interrupted process stops the run. Resolve the
error, renew the session if necessary, and rerun with the **same upload ID and
state**. Completed items are read and verified, and pending items replay the
same key. If the state is lost, the same upload ID and unchanged source batch
can recover IDs through backend replay. Backend keys do not expire. Different
payloads or deleted resources return 409; they are not treated as success.

Legacy checkpoints and mismatched origins/users/upload IDs/materials are
rejected before writes. Do not discard a legacy checkpoint and start a new
upload against existing partial data: review those resources explicitly first.
Do not generate a new upload ID to work around a conflict. A new backend or
account requires a separately reviewed upload and state file.

The tool only creates/completes DRAFT courses. It verifies course status on
resume and before child mutations, stops for PUBLISHED/ARCHIVED courses, and
never publishes or assigns courses. Source labels use `sourceNumber`, including
the original repeated BCI number 3; identities use course/page/question position.

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
python3 -m unittest discover -s tools/course-materials -p 'test_*.py' -v
pnpm exec prettier 'tools/course-materials/*.json' --write
```

The source decks themselves are not committed. The extractor deliberately
normalizes accidental `。。` to `。`, but otherwise preserves the slide text,
including the source's repeated question number `3` in BCI page `1-3`.
Extraction and validation work with Python 3.9 or later and use only the
standard library. The regression tests use miniature XML decks, so they do
not require the original PPTX inputs to run in CI.
