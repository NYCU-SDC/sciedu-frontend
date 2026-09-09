# Dire-wolf course importer

The canonical student text, hidden image captions, question prompts, image filenames, and semantic keys are stored in `course-manifest.json`.

Start the shared local course service from the repository root:

```sh
npx vite --config tools/brain-interface-course/vite.config.mjs tools/brain-interface-course
```

Local student preview:

```text
http://localhost:5173/course/00000000-0000-4000-8000-000000000002
```

When the dev backend is available, open the reusable DRAFT importer at:

```text
http://localhost:3000/?course=dire-wolf-restoration
```

The importer checkpoints each semantic key to its backend UUID and never publishes the course.
