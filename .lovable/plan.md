## Scope

Ten linked features. Below is what I will build and the technical approach, grouped so related work ships together.

### 1. Hostify AI (only model)
- Replace every model in `src/lib/aiModels.ts` with a single entry `hostify-ai` labeled "Hostify AI" with badge "Powered by Hostify".
- Rewrite `supabase/functions/ai-router/index.ts` to call the three Hostify endpoints (`/grok`, `/gemini`, `/deepseek`) with an auto-fallback chain: try grok, then gemini, then deepseek.
- Code playground / code-mode routing: detect `mode === "code"` and prepend a strict system prompt that tells the model to emit only file blocks in the form `FILE: path\n\`\`\`lang\n...\n\`\`\`` so the playground can parse and write files. This is what unblocks "cannot process raw materials on code section".
- Hide other providers in the picker (visual card grid keeps one big "Hostify AI" card).

### 2. /wallet page
- New route `/wallet` (`src/pages/Wallet.tsx`) showing: current balance, monthly grant date, last 30-day usage chart (token_transactions grouped by day), full transaction list with type chips (grant, spend, refill, referral), and a "Recharge" button that links to /tokens.

### 3. Admin dashboard upgrades (traxxiontech@gmail.com only)
- Extend `AdminDashboard.tsx`: user table with search/filter, columns for last IP / last seen / device / location (from `user_sessions`), inline "Grant tokens" dialog, plan toggle (free/pro), ban/unban.
- New edge function `admin-actions` (verify_jwt true, checks `has_role(uid,'admin')`) for: grant_tokens, set_plan, ban_user.

### 4. Project export — ZIP + APK
- New edge function `project-export`: builds a ZIP from `projects.files` JSON using `jszip` and returns a signed download. APK button calls the same function with `format=apk` which queues a build row in a new `apk_builds` table and shows "Pending" until a build URL is filled (manual/CI later); UI surfaces the download when ready.

### 5. Real-time collaboration
- Enable realtime on `projects`. In `ProjectViewer.tsx` subscribe to `postgres_changes` for the row and to a presence channel `project:{id}` broadcasting `{userId, name, color, cursor:{x,y}, file}`. Render a participant avatar stack + floating cursor labels. Saves debounce-write to `projects.files`, broadcast triggers refetch for others (last-write-wins; good enough for v1, no CRDT).

### 6. Passkey signup + signin with auto session
- Replace the `action_link` redirect path in `webauthn/index.ts` `auth-verify` with: server creates a one-time `session_token` (using `supabase.auth.admin.generateLink` type=magiclink) and returns `{ access_token, refresh_token }` directly via `generateAccessToken` admin API. Client calls `supabase.auth.setSession(...)` — no page redirect.
- Add `/passkey/signup` flow: collects email + display name, creates user via `supabase.auth.admin.createUser` (email-confirmed), enrolls passkey, signs in via same setSession path.
- AuthPage adds a "Sign up with device (Face ID / fingerprint / PIN)" button using the same WebAuthn primitive — the device prompts whatever it has (Face ID, Touch ID, Windows Hello PIN, Android biometric). No separate face/voice SDK is needed; WebAuthn delegates to the OS.

### 7. CodeVerse push fix ("cannot find user")
- The current code falls back to `"me"` for username. Add a real whoami: call `GET https://vaomqjetwvkffkiwqvsc.supabase.co/functions/v1/repo-api/user` with the cv_ token (CodeVerse exposes the current user there); use `data.username`. On 404, return a clear error telling the user to set their CodeVerse username in Integrations.

### 8. Cross-device data sync
- Everything already lives in Supabase (profiles, token_balances, user_sessions, projects, chat threads). Concrete gaps to close:
  - Ensure chat history table exists with RLS scoped to `auth.uid()` (add `chat_messages` if missing).
  - Add a `last_active_at` touch on every session — already in `tracking.ts`; verify it writes on login from any device so all devices show in Settings.
- Result: signing in on any device shows the same wallet, chats, projects, sessions.

### 9. Permissions UX
- Add `src/lib/devicePermissions.ts` that, before passkey signup, requests `navigator.credentials.create` (which surfaces the OS biometric/PIN dialog) and on iOS/Android also pings `navigator.mediaDevices.getUserMedia({video:true})` once to trigger the camera permission prompt for "Face recognition" framing. Clear copy: "Stinger uses your device's built-in security (Face ID, fingerprint, PIN, pattern) — nothing biometric leaves your phone."

### 10. Wire-up
- Add `/wallet` to `App.tsx` routes and to `AppSidebar`.
- Token gating: AIStudio already checks `tokenBalance === 0` — extend to disable the send button with a "Top up in Wallet" link.

## Technical details

- New tables (migration): `apk_builds(id, project_id, user_id, status, apk_url, created_at)`, `chat_messages(id, user_id, thread_id, role, content, created_at)` if not present.
- New edge functions: `admin-actions`, `project-export`. Updates to: `ai-router`, `webauthn`, `codeverse-push`.
- New pages/components: `Wallet.tsx`, `PresenceLayer.tsx`, `GrantTokensDialog.tsx`.
- No third-party AI SDKs needed beyond `fetch` for Hostify.

## Out of scope for this turn
- Server-side rendering of APK (just queueing + download slot).
- True CRDT collaboration (using last-write-wins broadcasts).
- Multi-AI "agents working together" — Hostify is the only model now per your instruction.

Approve and I'll ship it.