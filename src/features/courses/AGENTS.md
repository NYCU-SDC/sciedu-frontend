# AGENTS.md — features/courses

Student-facing course pages (edu/dev modes, all behind `<RequireAuth>`). A
student only sees courses assigned to their current **ACTIVE** experiment.
The run/practice/lock layer lives in `features/experience/` — read its
AGENTS.md too.

## Pages

| Route               | Entry                                 | What it does                                                                                                                                |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/courses`          | `Homepage/Homepage.tsx`               | Course home: current task card, material progress, library shelf                                                                            |
| `/courses/library`  | `MaterialLibrary/MaterialLibrary.tsx` | Filterable, paginated list of assigned materials; continue / restart practice                                                               |
| `/course/:courseId` | `genetics/GeneticsCourse.tsx`         | Loads the course and renders `experience/CourseRun` → `player/CoursePlayer`. `?mode=review` replays a finished attempt with grading results |
| `/courses/summary`  | `Summary/Summary.tsx`                 | Completion summary: duration, per-question results, manual 重新載入評分                                                                     |

## Folders

- `services/` — current experiment: `GET /api/experiments/current` (404 → `null`,
  only `PUBLISHED` courses kept). Use `currentExperimentQueryOptions` /
  `useCurrentExperimentCourses`; don't refetch it ad hoc.
- `genetics/` — despite the name, the generic course loader + legacy genetics
  course. `services/` holds API calls (`fetchCourseDefinition`, `submitAnswer`,
  `fetchAnswerResult`, `courseAttempt`), `layouts/` the page layouts
  (Overview / Material / Questions), `components/` quiz cards, course chat,
  answer review.
- `player/` — `CoursePlayer.tsx` (page navigation, unlocking, answers, chat
  panel), `presentation.ts` (page config + simulations), `playerSession.ts`
  (local resume state), `Simulation.tsx` / `CCMSimulation.tsx` (sandboxed
  iframes from `public/simulations/`).
- `chat/prepareMaterialMessage.ts` — builds the material-context snapshot sent
  with course chat messages.
- `components/` — shared headers and `CurrentExperimentState` (loading / error /
  no-experiment screens).

## How a course is loaded

1. `courseId` is a UUID → remote course. `"genetics"` / `"1"` → the hard-coded
   legacy course in `genetics/assets/courseResource.ts`.
2. Eligible only if the current experiment is within schedule, its practice
   marker is valid, and the course is in its `PUBLISHED` assignments.
3. `fetchCourseDefinition` loads course, pages (sorted by `displayOrder`) and
   each page's blocks, then `mapPageBlocksToCoursePage` picks a layout.

**Reserved TEXT block orders** (set by the material importers in `tools/`):

- `displayOrder === 201` — versioned page presentation config (layout,
  simulation, stage, mental set). Parsed by `parsePresentation`; at most one per
  page. CCM courses **require** it.
- `displayOrder === 200` — hidden LLM context (figure captions / simulation
  notes). Never render it on material pages; it only feeds the chat snapshot.

Don't change these numbers or the presentation `version: 1` format without
updating the importers and their tests.

## Answers and grading

- Submit with `submitAnswer` (`POST /api/questions/:id/answers`, 30 s timeout).
  `useAnswerSubmission` saves a pending marker **before** each POST and the
  answer ID **immediately** on each success — not after the whole page.
- 400/401/403/404/422 = definite rejection, user may fix and retry.
  409, network errors, 5xx, timeouts and leftover pending = **unknown**: never
  treat as success and never auto-resend.
- Grading results (`answerResultQueryOptions`) are fetched once on entry and on
  manual refresh only: no polling, no refetch on focus/reconnect. Keep it that
  way — polling caused flicker. Ungraded shows 尚無評分, never zero / wrong.
- Practice mode: no answer POST and no grading calls at all.

## Course chat

- Material courses bind a preset by course code in
  `shared/network/materialChat.ts`: `scientific-argumentation-dark-room` →
  `augmentation_teacher_and_peer`, `ccm-heart-and-blood` → `ccm-agent-rag-test`.
  Other courses use the default. This binding is intentional and temporary.
- The snapshot is a versioned text envelope
  (`[SCIEDU_MATERIAL_CONTEXT_V1]…`) appended to the message `content`. It is not
  an API field — don't add `learning` / `courseContext` wire fields.
- Snapshot includes page body, captions, questions and the student's own answer
  states only. Never include answer keys, grades, other students' data, emails
  or cookies. Over 64,000 UTF-8 bytes → keep the input and stop sending; don't
  truncate or switch presets.
- Chat IDs are stored per page via `shared/auth/courseChatStorage.ts`. Retry /
  edit reuse the original snapshot; only new messages read fresh content.
- Full contract: `docs/material-chat.md`.

## Tests

Most services and player modules have a sibling `*.test.ts(x)`
(`mapCoursePage`, `fetchCourseDefinition`, `useAnswerSubmission`, `ccm`,
`presentation`, `playerSession`, `Summary`). Update them with any behavior
change; `CurrentExperimentNavigation.test.tsx` covers routing between pages.
