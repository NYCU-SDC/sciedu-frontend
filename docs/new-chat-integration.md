# SCIEDU-130: new chat integration

## Status and scope

Frontend implementation and mock verification; real end-to-end acceptance remains blocked on backend handoff and deployment verification. Keep the PR **Draft** until the real checklist below passes. This change starts from main and uses demo PR #53 as a visual reference only; it does not depend on Course Player PR #54 or include its commits.

Both standalone chat and the embedded course chat use the same structured message renderer and stream reducer. Multiple character turns remain one assistant message for editing/regeneration/branching. Students see public text, character identities, and short activity labels. Internal text, reasoning, tool arguments/results and raw server agent errors are not rendered. Existing legacy text messages still render Markdown/math, with thinking sections hidden.

Course context and experiment-specific presets are not added. A system preset is optional; without it the backend controls the default. Course chat keeps its existing in-memory chat selection lifecycle (browser reload does not reattach the course panel to its previous chat).

## Run and review

```sh
pnpm install --frozen-lockfile
VITE_APP_MODE=dev VITE_CHAT_MODE=mock pnpm dev --host 127.0.0.1 --port 5130
```

Open `/chat-preview/` for the real standalone components and history sidebar, or `/chat-preview/course` for the real embedded CourseChat in a sample course shell. The preview route exists only when **Vite DEV and VITE_CHAT_MODE=mock**; it supplies a local visitor context and does not change production authentication. The sample shell is not a new Course Player.

- Ordinary input: deterministic teacher → peer → teacher reply, with Markdown, math, a table, and hidden internal/tool fixtures.
- Input containing `[disconnect]`: the first subscription drops; “重新載入結果” replays from scratch without another POST.
- Input containing `[error]`: typed stream failure with partial content retained.
- “停止接收”: closes only the browser subscription; it does not cancel backend generation. “重新載入結果” starts a fresh subscription and refreshes history.
- Mock history lives under `sciedu-chat-mock-v1` in sessionStorage. It survives reload in this tab and is isolated from real backend data. Mock generation pauses when unsubscribed and resumes via deterministic replay; this is not a simulation of a continuously running server worker.

`VITE_CHAT_MODE=real` (the default) always uses the authenticated SciEdu backend. API failures never select mock automatically. `VITE_CHAT_PRESET` optionally supplies the server-owned preset name; leave empty to omit it. Normal routes retain their existing login requirements even in mock mode.

## Contract and transport

Source of truth: `NYCU-SDC/sciedu-api`, `service/chat.tsp` (agentic update PR #26).

- REST uses `/api/chat` and `/api/chat/:chatID`; SSE uses the returned **replyMessageID**, not the user message ID.
- All real requests include session cookies. Frontend does not directly call LLM `/agents`.
- Typed unnamed SSE frames: cast, agent_start, part_start, delta, part_end, agent_end, done, error. Legacy `{delta,isFinished}` and named legacy done frames remain readable.
- UTF-8, CRLF and multi-line data fields may cross network chunk boundaries. Malformed known events, HTTP errors, wrong content type, and EOF without a terminal frame terminate with recovery UI.
- Parts are indexed; part_end replaces accumulated data with its final snapshot. Reconnect starts a fresh accumulator. Public fallback content concatenates only non-internal text parts.
- Known completed snapshots are retained if GET temporarily returns streaming during database persistence. Cast/run metadata missing from a same-session GET is retained from the existing cache. This is not a substitute for backend historical persistence.
- No synthetic agentRuns are inferred from agent_start/agent_end: the stream contract has no stable run identifier on those events. Provided part.agentRunID and persisted agentRuns are retained.

## Backend handoff

Observed in backend main after merged PR #68 (SCIEDU-120), compared against the new TypeSpec contract:

| Area                  | Current code                                                   | Needed for acceptance                                                                                           |
| --------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Provider and events   | `/agents`, preset, typed SSE, JSONB final parts/cast supported | Verify deployed version and an actual multi-character preset                                                    |
| Historical identities | `MessageReturn`/`fetchMessages` return parts, not characters   | Return the persisted cast as `characters` in GET chat; test refresh in a fresh browser cache                    |
| Run identity          | MessagePart lacks agentRunID; AgenticData lacks agentRuns      | Preserve part run IDs and ordered run snapshots, including parentRunID/summonedBy, and return them in history   |
| Completed replay      | Groups adjacent parts by agent string                          | Preserve repeated/nested invocations and their association with parts; replay must agree with canonical history |
| Wire run mapping      | agent_start/end identify agent, not stable run ID              | Document/align the association with part.agentRunID; amend spec with backend owner if necessary                 |

Reproduction: stream a preset with teacher → peer → teacher (including a nested call), record cast and part IDs, then fetch GET chat after completion and reload the page with an empty query cache. Compare names, ordering and run IDs. The current frontend uses a neutral “學習助手” when identities are absent and does not invent role or call hierarchy.

No backend changes are included in this frontend PR. Coordinate Course Player #54's later integration around the existing CourseChat component and controller; keep the shared chat hook/renderer authoritative.

## Acceptance checklist

Automated: reducer event order and visibility; chunked SSE and HTTP/EOF failures; lifecycle stop/resume, chat-switch cleanup, persistence race, branch anchors; renderer privacy and legacy display. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm format` and builds with VITE_APP_MODE=edu/llm/dev.

UI: standalone and embedded empty/streaming/completed/failed/stopped states, reload and history, edit/regenerate/branch switch, long content/table/math, keyboard/IME, independent scrolling, desktop/tablet/narrow layout. Preview examples intentionally use mock data.

Real environment (required before Ready):

- [ ] Verify the backend deployment includes the agreed contract fixes and a multi-character default preset.
- [ ] Login and confirm REST/SSE cookies work across the configured origins; expired sessions report an actionable failure.
- [ ] Create and send in standalone and course surfaces, verify no direct LLM requests.
- [ ] Check cast, visible text, role turn order and hidden internal/reasoning/tool payloads.
- [ ] Refresh with an empty frontend cache; compare role identities, parts and runs with the original reply.
- [ ] Exercise completed replay, partial disconnect, stop/reload and done-before-persistence timing without duplicate text or extra POSTs.
- [ ] Verify editing, regeneration, branch switching, history listing and deletion.
- [ ] Record environment URL, backend/spec revisions, preset and results in PR; only then mark Ready.

## Local verification record

- 38 Vitest tests (including existing course tests), TypeScript, ESLint, Prettier and git diff whitespace checks pass.
- Production builds for edu, llm and dev pass. Vite reports its existing large-chunk advisory; no build error.
- Browser verified standalone chat and embedded CourseChat in the development preview: multi-character streaming, persisted history reload, formula/table rendering, edited root branch and previous-version navigation, disconnect/reload, stop/reload, and typed failure display.
- Layouts inspected at desktop 1280×720, tablet 768×1024 and narrow 390×844. Course verification uses the isolated sample shell; integration with the pending Course Player remains separate.
- Real authenticated backend/LLM end-to-end verification has not been performed. This PR remains Draft for the backend and deployment checklist above.
