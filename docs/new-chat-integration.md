# SCIEDU-130: agentic chat integration

Both standalone chat and the actual shared CoursePlayer use the same chat hook,
SSE reducer, recovery UI and message renderer. This PR preserves the existing
multi-character card design, Markdown/math, history, editing, regeneration and
branches. Internal text, reasoning, tool arguments/results and raw agent errors
are not rendered.

## Backend and transport

Validated with backend main `b9b14c3f04cd1ac1fa44ea43fc7850a9498fa306`
(merged SCIEDU-145 / PR #70) and API main
`7563d6d6f8ac35c4f793c2635010d29b95fc70bc`. The previous handoff blockers
around persisted characters, agentRuns and part.agentRunID have implementations
on backend main. Recorded replay events preserve empty nested invocation order;
this was tested separately from real LLM output.

REST uses `/api/chat` and `/api/chat/{chatID}`. Streaming uses
`GET /api/chat/stream/{replyMessageID}` with session cookies. The frontend never
calls LLM `/agents` directly. `VITE_CHAT_MODE=real` is the default; API errors do
not fall back to mock. `VITE_CHAT_PRESET` is optional and server-owned; acceptance
uses `default-agents` and also checks omission. There is no student preset picker.

Typed unnamed SSE events are cast, agent_start, part_start, delta, part_end,
agent_end, done and error. Legacy text events remain readable. The parser handles
UTF-8, CRLF and multiline frames across chunks. Part snapshots replace accumulated
deltas; reconnect starts a fresh accumulator. Public fallback text concatenates
only non-internal text parts. Run identities come from the backend, not inference.

Terminal SSE content remains readable while DB persistence catches up; bounded
canonical GET refreshes retrieve saved metadata. Completed GET snapshots are
accepted without using old cached cast/run fields to conceal missing server data.
Stop closes the subscription only, not backend generation. Reload first fetches
canonical history and reconnects only when the target is still streaming.

## Course and account lifecycle

The actual `/course/:courseId` player passes account, experiment, course and
stable API page IDs to the embedded controller. Legacy local pages use their
page index. Chat titles use course/page names rather than the old genetics title.

`sciedu-course-chat:v1:` entries contain only chat IDs, keyed by all four scope
fields. Reload validates a saved chat through GET. A missing chat removes only
its page reference; 401 and transient errors retain it and offer recovery.
Restart detaches the current chat and creates a new one on the next send; old
history is not deleted. Hidden pages close their subscriptions and resume on
return. Account-scoped query keys and route lifetimes prevent cached content,
drafts and callbacks from appearing in another account/conversation.

To make refresh on page two work, the player separately saves its local visited
position, unlocked navigation, answers and submitted answer IDs under
`sciedu-course-player:v1:`. This avoids restarting page one and resubmitting
already accepted answers. The snapshot is scoped by account/experiment/course,
invalidated when the page definition changes, and cleared on logout. It is local
recovery state, not server progress, an access grant or multi-device history.

401 provides a login action that resets stale session state and remembers a
safe local return URL. The existing OAuth redirect and authenticated login-page
handoff honor that URL; Google OAuth itself is not counted as tested. Logout
clears chat references, local player state, course attempts and query caches.

## Send failures and limits

The chat ID is retained as soon as creation succeeds, before sending the first
message. A failed/uncertain first send offers the existing chat; it does not
create another session automatically. Established chat send failures retain the
draft and require a canonical GET before application retries. IME Enter/229 and
Shift Enter do not prematurely send; pending sends are guarded against duplicates.

The Chat POST endpoints have **no idempotency contract**. In a fault test that
closed a connection without any HTTP response, Chromium itself retried the POST
and the server created a second branch. The application cannot promise exactly
one delivery in that case. A separate test confirmed that a backend commit
followed by an explicit proxy 502 preserves the existing chat and recovers by GET
without another application POST. Durable creation keys for Chat require a
separate backend/spec change; do not hide this transport limitation.

Course content, images, questions/answers and source image descriptions are not
automatically sent to the LLM. The chat scope is client-side recovery metadata.
Course-aware LLM context, full server progress and multi-device course-chat
associations remain subsequent work.

## Run and validation

```sh
pnpm install --frozen-lockfile
pnpm test
VITE_APP_MODE=dev VITE_CHAT_MODE=real pnpm typecheck
pnpm lint
pnpm format
VITE_APP_MODE=edu VITE_CHAT_MODE=real pnpm build
VITE_APP_MODE=llm VITE_CHAT_MODE=real pnpm build
VITE_APP_MODE=dev VITE_CHAT_MODE=real pnpm build
```

Tests explicitly set real mode rather than inheriting a developer's mock .env.
Shared hook/storage/controller tests cover persistence races, canonical metadata,
401, failed history, uncertain sends, account/page/experiment isolation, stale
subscriptions, first-message failure, same-tick duplicate sends, safe login
returns, local player recovery and IME. Existing course/Summary tests are retained.

Real authenticated acceptance used an isolated database/backend connected to
`https://llm.dev.sciedu.sdc.nycu.club`, plus actual standalone and CoursePlayer
browser surfaces. Evidence includes real multi-character generation, saved
history and completed replay, course refresh, choice/TEXT/optional/reading to
Summary, stop/reload, injected disconnect/502, editing/branches, deletion,
logout/account/experiment isolation and responsive layouts. Deterministic
upstream tests for nested/empty runs and failures are labeled separately.

The PR is marked Ready only after the latest head passes CI. Review and merge are
manual; merged-main verification follows the user's merge.

## Development preview

```sh
VITE_APP_MODE=dev VITE_CHAT_MODE=mock pnpm dev
```

`/chat-preview/` and `/chat-preview/course` exist only in Vite DEV with mock mode.
They use an isolated sample shell and do not bypass production authentication.
Mock history is tab-local; `[disconnect]` and `[error]` are deterministic fixtures.
Mock preview is not evidence of real backend/LLM acceptance.
