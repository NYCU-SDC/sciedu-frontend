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
