# AGENTS.md — features/experience

The experiment run layer that wraps the course player: platform home, experiment
schedule/status, practice ("無限練習") mode, local progress persistence and the
single-tab learning lock. Background and acceptance evidence:
`docs/material-testing-experience.md` (Chinese).

## Files

| File                        | Role                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PortalHome.tsx`            | `/` home. Shows 教材 / 實驗管理 / AI 聊天 cards by `VITE_APP_MODE`; admin card only for ADMIN or EXPERIMENTER |
| `CourseRun.tsx`             | Wraps `courses/player/CoursePlayer`: acquires the learning lock, manages practice rounds and restart          |
| `experimentExperience.ts`   | Practice-mode marker parsing/encoding, display status and schedule checks                                     |
| `useExperimentClock.ts`     | `now` that re-renders at the next schedule boundary (and on focus / visibility change)                        |
| `useLearningLock.ts`        | Web Locks lock so one course is edited in only one tab                                                        |
| `persistentStorage.ts`      | `readPersistent` / `writePersistent` / `clearPersistent` (localStorage, migrates old sessionStorage)          |
| `practiceRound.ts`          | Storage key and reader for the current practice round ID                                                      |
| `LearningSessionContext.ts` | Context exposing practice flag, submissions and per-question pending/unknown state                            |

## Rules that are easy to break

**Practice mode is stored in the experiment description.** There is no API
field. `encodeExperience` appends `<!-- sciedu-experience:v1:practice -->`;
no marker = standard experiment. An unknown, duplicated or malformed marker
makes `parseExperience` return `valid: false`, and the course must be blocked,
not treated as standard. The encoded description is capped at 4,000 chars.
Always strip the marker via `parseExperience` before showing a description.

**Display status is computed on the client.** Use `displayStatus(e, now)` and
`isWithinSchedule(e, now)` with `now` from `useExperimentClock` — never compare
`Date.now()` inline. `ACTIVE` before start is 尚未開始, after end is 已結束;
`SCHEDULED` past its end is 排程已結束. Expiry does **not** mean the backend
status changed; never send a status update just because time passed.

**Practice never touches official answers.** In practice mode, answers are
local only: no answer POST, no fake answer IDs, no grading API calls. Chat
still uses the real Chat API and material preset, with `mode: "practice"` and
the round ID in the snapshot.

**Practice rounds.** Each round is a `crypto.randomUUID()` persisted per
backend + account + experiment + course. Restart asks for confirmation, writes
a new round ID and clears only this browser's keys for the old round
(`PLAYER_SESSION_PREFIX`, `COURSE_CHAT_PREFIX`, `COURSE_ATTEMPT_PREFIX`
containing the round ID). Never delete remote conversations.

**Storage.**

- Always go through `persistentStorage.ts`; don't call `localStorage` directly
  for learning data. `writePersistent` throws if the write didn't stick — catch
  it and show a retry/error, don't silently continue.
- Every key must include `backendEnvironment()`, account and experiment (plus
  course, page and round where relevant) so data never leaks between backends,
  users or rounds.
- Local progress is recovery only — never treat it as server progress or as
  permission. Logout clears local learning data; other tabs react via the
  `storage` event.

**Learning lock.** `useLearningLock` uses `navigator.locks` with
`ifAvailable`. There is deliberately **no** localStorage fallback: if Web Locks
are unavailable or the lock is held elsewhere, the player stays blocked with a
reload prompt. Re-acquire on `pageshow` from bfcache.

## Tests

`PortalAndClock.test.tsx`, `PracticeFlow.test.tsx`, `LearningRecovery.test.tsx`,
`experimentExperience.test.ts`. Cover time boundaries, marker parsing, round
restart, recovery after remount and the two-tab lock when changing this folder.
