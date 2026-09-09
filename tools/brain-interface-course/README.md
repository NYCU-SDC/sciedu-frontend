# Brain-interface course importer

This local-only tool publishes `course-manifest.json` and the eight source images as a DRAFT course. It records each semantic key and UUID in browser local storage so an interrupted import can continue without duplicating verified resources.

Run from the repository root:

```sh
npx vite --config tools/brain-interface-course/vite.config.mjs tools/brain-interface-course
```

Open `http://localhost:3000`, use the dev backend, verify the signed-in session, and enter `PUBLISH DRAFT`. Keep the downloaded UUID mapping with the implementation record. Publishing the course is intentionally outside this tool.
