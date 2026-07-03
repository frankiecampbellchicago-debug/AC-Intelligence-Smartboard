# Shared Board (Option B) — setup runbook

This turns the Smartboard from a per-browser app into a **shared board**: both
collaborators' GitHub accounts + repos live on the backend, auto-refresh every
5 minutes, and every visitor sees the same, always-current view.

## How it works

- The backend (`backend/`) now exposes a small REST API alongside the terminal:
  `/state`, `/github/status`, `/github/repos`, `/github/accounts`.
- GitHub Personal Access Tokens are **encrypted at rest (AES-256-GCM)** and are
  **never returned to any browser** — the server decrypts them only in memory to
  call the GitHub API.
- The web app reads/writes the shared state instead of localStorage. If the
  backend is unreachable it silently falls back to per-browser localStorage, so
  the app never bricks.
- A shared secret (`BOARD_SECRET`) gates the API. It's baked into the web build
  so neither user types anything. **Note:** because the site is public, a
  determined person could read the secret out of the JS bundle — it keeps casual
  visitors out, but the real protection is that tokens are encrypted and never
  served. Treat the merged repo list (incl. private repo names) as "visible to
  anyone who really digs." If that's not acceptable, don't sync private repos.

## One-time setup

### 1. Generate an encryption key (32 bytes)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-char hex string.

### 2. Deploy / configure the Railway backend

In the Railway project (Root Directory = `backend`), add these variables:

| Variable         | Value                                                        |
| ---------------- | ------------------------------------------------------------ |
| `ENCRYPTION_KEY` | the 64-char hex key from step 1                              |
| `SESSION_SECRET` | any long random string (signs login sessions)               |
| `USERS`          | JSON array of users — see the Login gate section below      |
| `ALLOWED_ORIGIN` | `https://frankiecampbellchicago-debug.github.io`            |
| `DATA_DIR`       | `/data`                                                       |

`BOARD_SECRET` is optional now — the **login gate** (below) is the recommended
way to protect the site. If both `USERS`+`SESSION_SECRET` are set, login is
enforced and `BOARD_SECRET` is ignored.

### Login gate (site sign-in + "remember me")

The site shows a sign-in screen; a session is issued on login and, when
"Remember me" is checked, persists ~30 days for quick re-access (else it clears
when the tab closes). Sessions are stateless HMAC tokens — nothing to store.

Create a user entry for each person (run inside `backend/`):

```bash
node hash-password.js kaiden 'your-password-here'
node hash-password.js frankie 'their-password-here'
```

Each prints `{"username":"...","passwordHash":"scrypt$..."}`. Put both in the
`USERS` env var as one JSON array:

```
USERS = [{"username":"kaiden","passwordHash":"scrypt$..."},{"username":"frankie","passwordHash":"scrypt$..."}]
```

The login gate also protects the terminal WebSocket — the shell endpoint now
rejects connections without a valid session token.

Then add a **Volume** mounted at `/data` (Railway → service → Volumes) so the
board survives redeploys. Redeploy the service.

Verify: open `https://<your-app>.up.railway.app/health` — it should return
`{"status":"ok","persistent":true}`.

### 3. Configure the GitHub Pages build

Repo → **Settings → Secrets and variables → Actions**:

- **Variables** tab → New variable: `BACKEND_URL` = `https://<your-app>.up.railway.app`
- **Secrets** tab → New secret: `BOARD_SECRET` = the exact same value as on Railway

Re-run the **Deploy to GitHub Pages** workflow (Actions tab → Run workflow).

### 4. Connect the two accounts (once, ever)

Open the site → Settings → GitHub → "+ Connect a GitHub account" → paste each
person's PAT (classic, `repo` scope). Each token is sent once to the server,
encrypted, and stored. From then on **both people see both accounts' repos** with
no further action.

## Rotating / revoking

- Revoke a token on GitHub, then remove the account in Settings and re-add a new one.
- Rotate `ENCRYPTION_KEY` only if you also clear stored accounts (old tokens
  become undecryptable and are skipped).
