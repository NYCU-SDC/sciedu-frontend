# AGENTS.md — features/chat

Agentic LLM chat. Used by the standalone chat (`/chat`, llm/dev modes) **and**
embedded in the course player (`courses/genetics/components/CourseChat.tsx`
via `useCourseChatController`). Both share the same hook, SSE reducer, recovery
UI and message renderer — a change here affects courses too. Background:
`docs/new-chat-integration.md`.

## Pages

| Route                    | Entry                            | What it does                                               |
| ------------------------ | -------------------------------- | ---------------------------------------------------------- |
| `/chat`                  | `pages/NewChatPage.tsx`          | Empty composer; first send creates the chat and navigates  |
| `/chat/:chatID`          | `pages/ChatConversationPage.tsx` | Thread with streaming, edit, regenerate, branch switching  |
| (layout)                 | `pages/ChatLayout.tsx`           | Sidebar (paginated history) + top bar; takes `basePath`    |
| `/chat-preview[/course]` | `pages/ChatPreview.tsx` (lazy)   | Dev-only, `VITE_CHAT_MODE=mock`: UI preview with mock data |

## Data flow

- **Transport** (`src/shared/network/`): `chat.ts` has REST calls
  (`POST /api/chat`, `GET /api/chat/:id`, list, create message) and
  `CHAT_HISTORY_QUERY_KEY`; `chatStream.ts` reads SSE from
  `GET /api/chat/stream/:replyMessageID` with cookies. The frontend never calls
  the LLM service directly.
- **`services/useChat.ts`** — the facade. `sendMessage` is the single write
  primitive; `resend` and `editAndSend` are thin wrappers. Server state comes
  from React Query (`useChatMessages`), streaming from `useMessageStream`,
  branch choice from `useBranchSelection`.
- **`services/agentStream.ts`** — `parseEvent` + `reduceEvent` turn SSE events
  into an `AgentSnapshot` (content, parts, characters, active agents, phase).
  Keep it pure; it is the most tested part.
- **`services/branching.ts`** — pure tree logic. Messages link by `previousID`;
  regenerate/edit creates siblings. The backend sends "no parent" as `""` or the
  nil UUID; `normalizeMessage` in `chat.ts` collapses both to `undefined`.
- **`services/mockChat.ts`** — mock backend, only loaded when
  `VITE_CHAT_MODE=mock`. Real mode never falls back to mock on errors.

## SSE events

Typed events (`types/sse.ts`): `cast`, `agent_start`, `part_start`, `delta`,
`part_end`, `agent_end`, `done`, `error`. Legacy `{ delta, isFinished }` frames
must stay readable. The parser handles UTF-8 split across chunks, CRLF and
multi-line `data:` frames. Part snapshots replace accumulated deltas; a
reconnect starts a fresh accumulator.

## Rules

- Never render internal text, reasoning, tool arguments/results or raw agent
  errors. Only public, non-internal text parts are shown.
- Stop only closes the subscription; it does not cancel backend generation.
  Reload fetches canonical history first and reconnects only if the target
  message is still streaming.
- Character/run identities come from the backend — don't infer them.
- `VITE_CHAT_PRESET` is optional and server-owned. There is no student preset
  picker; material courses pick presets in `shared/network/materialChat.ts`.
- User messages from courses carry a material-context envelope in `content`;
  `normalizeMessage` decodes it so the UI shows only the student's text. Don't
  display or edit the envelope.
- Errors go through `components/ChatRecovery.tsx`: 401 → re-login (remembers
  return path), 404 → 找不到這個對話, otherwise a reload/restart option.
- Query keys must be account-scoped so cached chats never show in another
  account.
- Markdown + math rendering: `MessageTurn.tsx` with `normalizeMath.ts` and
  `parseAssistantContent.ts`.

## Tests

`agentStream.test.ts`, `useChat.test.tsx`, `mockChat.test.ts`,
`ChatRecovery.test.tsx`, `Composer.test.tsx`, `MessageTurn.test.tsx`, plus
`src/shared/network/chat*.test.ts`. Add reducer cases for any new SSE event.
