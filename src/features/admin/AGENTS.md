# AGENTS.md — features/admin

Experimenter admin: schedule experiments, assign courses and participants,
archive. Available in edu/dev modes behind `<RequireAuth>` +
`<RequireAdminRole>` (roles `ADMIN` or `EXPERIMENTER`). UI is Mantine.
Background: `docs/experiment-termination/README.md` (Chinese).

## Pages

| Route                                   | Entry                            | What it does                                             |
| --------------------------------------- | -------------------------------- | -------------------------------------------------------- |
| `/admin`                                | `pages/AdminDashboardPage.tsx`   | Overview: stats and current/upcoming experiments         |
| `/admin/experiments`                    | `pages/ExperimentListPage.tsx`   | Search, date range, status filter, pagination            |
| `/admin/experiments/new`                | `pages/CreateExperimentPage.tsx` | Multi-step form: basic settings → courses → participants |
| `/admin/experiments/:experimentId`      | `pages/ExperimentDetailPage.tsx` | Summary, course/participant tables, add/remove, archive  |
| `/admin/experiments/:experimentId/edit` | `pages/CreateExperimentPage.tsx` | Same form in edit mode                                   |

Layout pieces: `AdminLayout`, `AdminSidebar`, `AdminPageHeader`,
`AdminPageState` (loading/error/empty).

## Data

- All API calls are in `services/adminRepository.ts` (`/api/users/me`,
  `/api/experiments[...]`, `/status`, `/courses`, `/participants`,
  `/api/courses`, `/api/users`). Add new calls there, never in pages.
- Query keys start with `["admin", "experiments", ...]` (detail:
  `["admin", "experiments", id, "detail"]`). After a mutation, invalidate the
  admin keys **and** `["student", "current-experiment"]`, since students'
  current experiment may change.
- `services/experimentDraft.ts` converts between `ExperimentDetail` and the form
  draft (`experimentToDraft`, `buildExperimentPayload`) and builds the human
  summaries (`feedbackSummary`, `retryLabel`, `releaseLabels`).

## Rules

- **Time zone**: the form edits times in `Asia/Taipei`
  (`toTaipeiInputValue`), sent as ISO with `+08:00`. An unchanged field keeps
  the original timestamp exactly. Don't use the browser's local zone.
- **Status shown to users** comes from `experience/experimentExperience.ts`
  (`displayStatus` with `useExperimentClock`). The list page fetches all
  matching pages (`listAllExperiments`), then filters/sorts/paginates by that
  computed status. Expiry is display-only; never auto-send a status change.
- **Practice mode** is the description marker (see `features/experience`).
  Use `parseExperience` / `encodeExperience` via `experimentDraft.ts`; mode
  cannot change once the experiment is ACTIVE.
- **Edit locks by backend status**: ACTIVE locks schedule and settings fields.
  Courses can be added in DRAFT/SCHEDULED/ACTIVE but removed only in
  DRAFT/SCHEDULED. ARCHIVED is read-only.
- **Archive** (`hooks/useExperimentArchive.ts`): `PUT /status` with
  `ARCHIVED`, 15 s timeout, always behind a confirm modal
  (`ArchiveExperimentModal`). DRAFT/SCHEDULED → 取消並封存, ACTIVE → 提前結束並封存,
  COMPLETED → 封存實驗. 4xx = rejected: show reason and re-read. Network /
  timeout / 5xx = unknown: GET to verify; if still unknown only offer
  "re-check", never auto-resend the PUT. Archiving keeps all data.
- **Demo mode**: `isAdminDemoMode` (DEV + `VITE_ADMIN_DEMO_MODE=true`) serves
  `data/demoAdminData.ts` with no network. Every repository function must keep
  its demo branch, and demo must stay unreachable in production builds.
- Participant/course candidates are paged (`MAX_PAGE_SIZE = 100`); don't
  assume one page holds everything.

## Tests

`services/adminRepository.test.ts`, `services/experimentDraft.test.ts`,
`hooks/useExperimentArchive.test.tsx`, `pages/ExperimentArchive.test.tsx`,
`pages/ExperimentAdminNavigation.test.tsx`. Archive flows need cases for
reject / unknown / verify; demo mode must make zero network calls.
