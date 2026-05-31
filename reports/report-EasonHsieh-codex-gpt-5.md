## [2026-05-31 17:53 CST] Task Record

### Task Description
- Branch: `SCIEDU-85-implement-session-management-system`.
- Goal: Implement the frontend session-management system based on the SciEdu HttpOnly-cookie auth spec, building on the login screen from branch `SCIEDU-84-implement-login-screen`.

### Actions Taken
- Created auth infrastructure under `src/features/auth/`:
  - `components/AuthProvider.tsx`
  - `components/AuthRoutes.tsx`
  - `context/AuthContext.ts`
  - `context/useAuth.ts`
  - `services/authApi.ts`
  - `types.ts`
  - `utils/navigation.ts`
- Updated `src/features/auth/pages/LoginPage.tsx` so the Google login button calls `login("google")`.
- Updated `src/routes.tsx` to mount `AuthProvider`, keep `/login` public, and protect `/chat`, `/course/:id`, and `/examplechat`.
- Updated `src/shared/utils/api.ts` to:
  - include cookies via `credentials: "include"`,
  - expose typed `ApiError`,
  - support one-shot 401 refresh retry with single-flight behavior,
  - provide auth hooks for logout/unauthorized handling.
- Updated `src/features/chat/services/streamMessage.ts` so streaming requests include cookies and retry once after refresh on 401.
- Commit present on this branch:
  - `5c9248074d5c1183516275dc78ce92fa9728abd5`
  - `add HttpOnly cookie auth session management (without backend implemented)`

### Attempted Methods
- Rejected the original clustron-style prompt because it required JavaScript-readable `accessToken`/`refreshToken`, `react-cookie`, `jwt-decode`, and `setCookiesForAuthToken`, which conflict with SciEdu's HttpOnly-cookie spec.
- Used a session-metadata model instead:
  - `GET /api/users/me`
  - `GET /api/auth/session`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - OAuth redirect via `/api/login/oauth/google?r=<returnUrl>`.
- Added flexible response adapters for `User` and `AuthSession` because backend response wrapping was not finalized.
- Implemented proactive refresh with `setTimeout`, resume handling for `visibilitychange`/`focus`/`online`, transient refresh retry with capped backoff, and basic `BroadcastChannel` sync.

### Verification
- Passed `pnpm typecheck`.
- Passed `pnpm lint`.
- Passed `pnpm format`.
- Passed `pnpm build`.
- Local Vite dev server ran on `http://localhost:5174/` because `5173` was already occupied.
- `curl -I http://localhost:5174/login` returned `200 OK`.
- `curl -I http://localhost:5174/chat` returned `200 OK` at the SPA shell level.

### Issues & Blockers
- Backend auth endpoints were not implemented at the time of this branch, so full OAuth/session verification could not be completed end to end.
- Browser automation could not be completed because the in-app Browser connector reported no available browser sessions.
- Vite build emitted an existing large chunk warning due to large font/assets; this was not caused by the auth implementation.
- The current commit subject is descriptive but not conventional-commit style. Suggested replacement if amending:
  - `feat: add HttpOnly cookie auth session management`

### Next Steps
- Once backend auth endpoints exist, manually verify:
  - `/login` Google OAuth redirect includes the correct encoded `r` return URL.
  - unauthenticated protected routes redirect to `/login`.
  - successful OAuth returns to the original route.
  - authenticated users visiting `/login` redirect away.
  - 401 API responses refresh and retry once.
  - refresh 401 logs out, broadcasts logout, shows a toast, and navigates to `/login`.
- After backend response shapes are finalized, simplify `authApi.ts` adapters to the canonical wire format.
- Consider adding integration tests or mocked auth-route tests once the project has a test runner.
