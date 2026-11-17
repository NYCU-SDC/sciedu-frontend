# AGENTS.md — SciEdu Frontend

React 19 + TypeScript SPA for SciEdu (NYCU SDC). One codebase serves three app
modes: the educational course/experiment site, a standalone LLM chat, or both.
Course materials are produced by Python/Node tooling in `tools/`.

## Commands

Use **pnpm** (v11, Node 24). Never use npm or yarn; never commit other lockfiles.

| Task         | Command                                                      |
| ------------ | ------------------------------------------------------------ |
| Install      | `pnpm install`                                               |
| Dev server   | `pnpm dev` (http://localhost:5173)                           |
| Type check   | `pnpm typecheck`                                             |
| Lint         | `pnpm lint`                                                  |
| Format check | `pnpm format` (fix with `pnpm exec prettier . --write`)      |
| Tests        | `pnpm test` (Vitest; one file: `pnpm test src/path.test.ts`) |
| Build        | `pnpm build`                                                 |

Before saying a change is done, run
`pnpm typecheck && pnpm lint && pnpm format && pnpm test` — CI runs all four on
every PR. For UI changes, also check the result in the dev server.

If you touch `tools/` or `public/simulations/`, the "Validate Course Materials"
workflow runs too; run the matching checks from
`.github/workflows/course-materials.yaml` locally (Python `unittest` and
`node --test`).

## Environment

Copy `example.env` to `.env` (never commit `.env`).

- `VITE_APP_MODE` — **required**, `vite.config.ts` throws otherwise:
  `edu` (course + admin routes), `llm` (chat routes), `dev` (both).
- `VITE_BACKEND_BASE_URL` — backend; the example points at the Dev backend.
- `VITE_CHAT_MODE` — `real` (default) or `mock`. No automatic fallback.
- `VITE_CHAT_PRESET` — optional agent preset; empty = backend default.
- `VITE_ADMIN_DEMO_MODE` — local-only admin mock data; ignored in prod builds.
- `VITE_PUBLIC_POSTHOG_PROJECT_TOKEN` / `VITE_PUBLIC_POSTHOG_HOST` — optional.

Mock modes and demo data must stay behind `import.meta.env.DEV` checks.

## Project layout

```
src/
  main.tsx, App.tsx    Providers: Mantine, PostHog, React Query, Radix Theme, Toaster
  routes.tsx           All routes, gated by VITE_APP_MODE (covered by routes.test.ts)
  mantineTheme.ts      Mantine theme
  features/
    admin/             Experimenter admin (experiments CRUD, participants)
    auth/              Login
    chat/              Standalone LLM chat (SSE streaming, branching)
    courses/           Homepage, MaterialLibrary, Summary, player, genetics, course chat
    experience/        Experiment run flow: portal, clock, practice, learning lock
  shared/
    auth/              AuthProvider, RequireAuth, session + local storage
    network/           chat.ts, chatStream.ts (SSE), materialChat.ts
    utils/api.ts       The fetch wrapper
    components/, hooks/
  styles/              colors.css (design tokens), normalize.css
docs/                  Design notes (some in Chinese), e.g. material-chat.md
tools/                 Course-material extraction/publishing (Python + Node)
```

Inside a feature use `pages/`, `components/`, `services/`, `hooks/`, `types/`.
New code goes in the owning feature; move to `shared/` only when a second
feature needs it. Read the related `docs/*.md` before changing material chat,
experiment termination or the testing experience.

**Feature details live in nested AGENTS.md files** — read the one for the
folder you're changing: `src/features/{admin,chat,courses,experience}/AGENTS.md`.

## Routes

Defined in `src/routes.tsx`. All pages except `/login` require auth.

| Route                           | Page                                | Feature        | Modes                       |
| ------------------------------- | ----------------------------------- | -------------- | --------------------------- |
| `/`                             | PortalHome (cards by mode and role) | experience     | all                         |
| `/login`                        | LoginPage                           | auth           | all                         |
| `/courses`                      | Homepage                            | courses        | edu, dev                    |
| `/courses/library`              | MaterialLibrary                     | courses        | edu, dev                    |
| `/course/:courseId`             | GeneticsCourse → CourseRun → player | courses        | edu, dev                    |
| `/courses/summary`              | Summary                             | courses        | edu, dev                    |
| `/admin`                        | AdminDashboardPage                  | admin (+ role) | edu, dev                    |
| `/admin/experiments[/new]`      | ExperimentList / CreateExperiment   | admin (+ role) | edu, dev                    |
| `/admin/experiments/:id[/edit]` | ExperimentDetail / CreateExperiment | admin (+ role) | edu, dev                    |
| `/chat`, `/chat/:chatID`        | NewChatPage / ChatConversationPage  | chat           | llm, dev                    |
| `/chat-preview[/course]`        | ChatPreview (mock data)             | chat           | DEV + `VITE_CHAT_MODE=mock` |

With `VITE_ADMIN_DEMO_MODE=true` in DEV, the admin routes skip auth and use
demo data.

## Conventions

- **Formatting**: Prettier — 4-space indent, double quotes, semicolons, ES5
  trailing commas. Don't hand-format; run Prettier.
- **Types**: `strict` + `verbatimModuleSyntax` — use `import type` for type-only
  imports. No `any`; no unused vars (prefix with `__` if intentional).
- **Logging**: no `console.log` (lint warns); `console.warn` / `console.error` only.
- **UI**: Mantine (`@mantine/core`) is used for newer screens (admin, experience,
  course homepage); Radix Themes for older ones. Match whatever the surrounding
  feature uses; don't introduce a third UI library or Tailwind.
- **Styling**: CSS Modules (`Component.module.css` next to `Component.tsx`). Use
  tokens from `src/styles/colors.css` instead of hard-coded colors.
- **Icons**: `lucide-react`. **Toasts**: `sonner`.
- **Routing**: `react-router` v8, only in `src/routes.tsx`. Protect pages with
  `<RequireAuth>`; admin pages also with `<RequireAdminRole>`. Update
  `routes.test.ts` when routes change.
- **Markdown/math**: `react-markdown` + `remark-gfm` + `remark-math` +
  `rehype-katex`.

## Data fetching

- All HTTP goes through `api<T>()` in `src/shared/utils/api.ts` (base URL,
  `credentials: "include"` cookie auth, throws `ApiError` with `status`). Only
  SSE streaming (`shared/network/chatStream.ts`) calls `fetch` directly.
- Server state lives in **TanStack React Query**. Export query keys as
  constants/factories (see `courses/services/currentExperimentQueries.ts`) and
  invalidate them after mutations.
- Request functions live in a feature's `services/` (repository modules), not in
  components.
- The API contract is the TypeSpec spec in the sibling repo `../sciedu-api`
  (`main.tsp`). Match its shapes and field names; if spec and backend disagree,
  flag it instead of guessing. Don't invent new wire fields.

## Tests

- Vitest + Testing Library. Tests sit next to the code as `*.test.ts(x)`.
- Component tests need `// @vitest-environment jsdom` at the top of the file.
- Mock the network at `../utils/api` / `shared/network/*` with `vi.mock`; tests
  must never hit a real backend. Reset stubs (`vi.unstubAllEnvs()`) after env
  changes.
- Add or update tests for behavior changes in services, hooks, auth, routing
  and the experiment flow.

## Git & PRs

- Branch from `main`: `<type>/<short-description>`, all lowercase, words joined
  with `-`, **no ticket key** — e.g. `feat/submit-student-answers`,
  `fix/auth-session-race`. The Jira key goes in the PR title instead.
- Commits: Conventional Commits, lowercase, imperative —
  `feat: add course summary page`. Types: feat, fix, refactor, docs, chore, ci,
  test. Put `Refs: SCIEDU-<n>` in the body.
- PR title: `[SCIEDU-<n>] <Summary in Title Case>` — e.g.
  `[SCIEDU-93] Submit Student Answers to the Backend`. Keep the hyphen in the
  key (`SCIEDU-93`, not `SCIEDU93`). (Commit messages stay Conventional
  Commits; only the PR title uses this format.)
- PR body follows `.github/PULL_REQUEST_TEMPLATE.md` and links the Jira ticket.
  One ticket per PR.
- Don't commit `dist/`, `output/`, `tmp/`, `.env`, `tools/ccm/build/` or
  `__pycache__/`.

## Don'ts

- Don't add dependencies without a clear need; prefer what's installed.
- Don't edit `pnpm-lock.yaml` by hand.
- Don't touch `.github/workflows/`, `.deploy/`, `Dockerfile` or `nginx.conf`
  unless the task is about CI/deploy.
- Don't hard-code backend URLs or chat presets outside the documented bindings.
- Don't send answer keys, grades, other students' data, emails or cookies to
  the LLM in chat context (see `docs/material-chat.md`).
