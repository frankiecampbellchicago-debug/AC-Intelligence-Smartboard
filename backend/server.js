/**
 * AC Intelligence Smartboard — Backend
 *
 * 1. Terminal: WebSocket endpoint that spawns node-pty shell sessions (unchanged).
 * 2. Shared board: REST endpoints that hold the shared GitHub accounts + repo
 *    list + project store, so every visitor sees the same, always-current board.
 *    GitHub PATs are stored encrypted (see store.js) and never returned to a client.
 *
 * Deploy to Railway: set Root Directory = backend, then Railway auto-runs `npm start`.
 *
 * Env:
 *   PORT            listen port (Railway injects this)
 *   ALLOWED_ORIGIN  CORS origin, e.g. https://<user>.github.io (default *)
 *   BOARD_SECRET    shared secret required on every /state and /github request
 *   ENCRYPTION_KEY  32-byte key for token encryption at rest (see store.js)
 *   DATA_DIR        persistent volume path for board.json (default /data)
 *   REFRESH_MS      auto-refresh interval for repos (default 300000 = 5 min)
 *
 * WebSocket protocol (JSON frames):
 *   Client → Server: { type: 'create', cols, rows, cwd?, runClaude? }
 *   Server → Client: { type: 'created', id }
 *   Server → Client: { type: 'data', id, data }
 *   Client → Server: { type: 'input', id, data }
 *   Client → Server: { type: 'resize', id, cols, rows }
 *   Client → Server: { type: 'kill', id }
 *   Server → Client: { type: 'exit', id }
 */

const express = require('express')
const { createServer } = require('http')
const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const cors = require('cors')
const { randomUUID } = require('crypto')
const os = require('os')
const store = require('./store')
const gh = require('./github')

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'
const BOARD_SECRET = process.env.BOARD_SECRET ?? ''
const REFRESH_MS = parseInt(process.env.REFRESH_MS ?? '300000', 10)

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json({ limit: '5mb' }))

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', ts: Date.now(), persistent: store.isPersistent() })
)

// ── Shared-board auth: constant-time compare of the shared secret ──────────

function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  const cryptoMod = require('crypto')
  return cryptoMod.timingSafeEqual(ab, bb)
}

function requireSecret(req, res, next) {
  if (!BOARD_SECRET) return next() // no gate configured — open (not recommended)
  const provided = req.get('X-Board-Secret') || ''
  if (safeEqual(provided, BOARD_SECRET)) return next()
  return res.status(401).json({ error: 'unauthorized' })
}

// Never leak the encrypted token to a client.
function publicAccounts(s) {
  return s.accounts.map((a) => ({ login: a.login, addedAt: a.addedAt || 0 }))
}

// ── Repo refresh (uses stored tokens; keeps the board current) ─────────────

let refreshing = null
async function refreshRepos() {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const s = store.load()
    const seen = new Set()
    const all = []
    for (const acc of s.accounts) {
      let token
      try {
        token = store.decrypt(acc.tokenEnc)
      } catch {
        continue // undecryptable (key rotated?) — skip
      }
      try {
        const repos = await gh.fetchRepos(token)
        for (const r of repos) {
          if (!seen.has(r.repoId)) {
            seen.add(r.repoId)
            all.push(r)
          }
        }
      } catch (e) {
        console.warn(`[repos] refresh failed for @${acc.login}:`, e.message)
      }
    }
    s.repos = all
    store.save(s)
    return all
  })()
  try {
    return await refreshing
  } finally {
    refreshing = null
  }
}

// ── Shared state ───────────────────────────────────────────────────────────

app.get('/state', requireSecret, (_req, res) => {
  const s = store.load()
  res.json({
    accounts: publicAccounts(s),
    repos: s.repos,
    store: s.store,
    whiteboard: s.whiteboard,
    updatedAt: s.updatedAt
  })
})

app.post('/state', requireSecret, (req, res) => {
  const s = store.load()
  if (req.body && typeof req.body.store === 'object' && req.body.store) s.store = req.body.store
  if (req.body && typeof req.body.whiteboard === 'object' && req.body.whiteboard) {
    s.whiteboard = req.body.whiteboard
  }
  const saved = store.save(s)
  res.json({ store: saved.store, whiteboard: saved.whiteboard, updatedAt: saved.updatedAt })
})

// ── GitHub (shared accounts + repos) ───────────────────────────────────────

app.get('/github/status', requireSecret, (_req, res) => {
  const accts = publicAccounts(store.load())
  if (!accts.length) return res.json({ connected: false, reason: 'not-authenticated' })
  res.json({
    connected: true,
    login: accts[0].login,
    additionalAccounts: accts.slice(1).map((a) => ({ login: a.login }))
  })
})

app.get('/github/repos', requireSecret, async (req, res) => {
  if (req.query.refresh) {
    try {
      await refreshRepos()
    } catch (e) {
      console.warn('[repos] on-demand refresh failed:', e.message)
    }
  }
  res.json(store.load().repos)
})

app.post('/github/accounts', requireSecret, async (req, res) => {
  const token = ((req.body && req.body.token) || '').trim()
  if (!token) return res.status(400).json({ error: 'Invalid token' })
  let login
  try {
    login = await gh.getLogin(token)
  } catch {
    return res.status(400).json({ error: 'Token is invalid or GitHub is unreachable' })
  }
  const s = store.load()
  if (s.accounts.some((a) => a.login === login)) {
    return res.status(409).json({ error: `@${login} is already connected` })
  }
  let tokenEnc
  try {
    tokenEnc = store.encrypt(token)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
  s.accounts.push({ login, tokenEnc, addedAt: Date.now() })
  store.save(s)
  refreshRepos().catch(() => {})
  res.json({ login })
})

app.delete('/github/accounts/:login', requireSecret, (req, res) => {
  const s = store.load()
  s.accounts = s.accounts.filter((a) => a.login !== req.params.login)
  store.save(s)
  refreshRepos().catch(() => {})
  res.json({ ok: true })
})

// ── Terminal (WebSocket) — unchanged ───────────────────────────────────────

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/terminal' })

const sessions = new Map() // id → { pty, ws }

function getShell() {
  if (process.platform === 'win32') return process.env.COMSPEC ?? 'cmd.exe'
  return process.env.SHELL ?? '/bin/bash'
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  console.log(`[ws] client connected from ${clientIp}`)

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }

    if (msg.type === 'create') {
      const id = randomUUID()
      const cols = Math.max(10, Math.min(300, Number(msg.cols) || 80))
      const rows = Math.max(5, Math.min(100, Number(msg.rows) || 24))
      const cwd = typeof msg.cwd === 'string' && msg.cwd ? msg.cwd : os.homedir()
      const shell = getShell()

      let ptyProcess
      try {
        ptyProcess = pty.spawn(shell, [], { name: 'xterm-color', cols, rows, cwd, env: process.env })
      } catch (err) {
        console.error('[pty] spawn failed:', err)
        ws.send(JSON.stringify({ type: 'error', message: `Failed to spawn shell: ${err.message}` }))
        return
      }

      sessions.set(id, { pty: ptyProcess, ws })

      ptyProcess.onData((data) => {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'data', id, data }))
      })

      ptyProcess.onExit(() => {
        sessions.delete(id)
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'exit', id }))
        console.log(`[pty] session ${id} exited`)
      })

      ws.send(JSON.stringify({ type: 'created', id }))
      console.log(`[pty] created session ${id} (${shell} ${cols}x${rows})`)

      if (msg.runClaude) ptyProcess.write('claude\r')
    } else if (msg.type === 'input') {
      const session = sessions.get(msg.id)
      if (session && typeof msg.data === 'string') session.pty.write(msg.data)
    } else if (msg.type === 'resize') {
      const session = sessions.get(msg.id)
      if (session) {
        const cols = Math.max(10, Math.min(300, Number(msg.cols) || 80))
        const rows = Math.max(5, Math.min(100, Number(msg.rows) || 24))
        session.pty.resize(cols, rows)
      }
    } else if (msg.type === 'kill') {
      const session = sessions.get(msg.id)
      if (session) {
        session.pty.kill()
        sessions.delete(msg.id)
      }
    }
  })

  ws.on('close', () => {
    for (const [id, session] of sessions) {
      if (session.ws === ws) {
        session.pty.kill()
        sessions.delete(id)
        console.log(`[pty] cleaned up session ${id} after disconnect`)
      }
    }
    console.log(`[ws] client disconnected from ${clientIp}`)
  })

  ws.on('error', (err) => console.error('[ws] error:', err))
})

server.listen(PORT, () => {
  console.log(`AC Smartboard backend listening on port ${PORT}`)
  if (!BOARD_SECRET) console.warn('[warn] BOARD_SECRET is unset — shared-board API is OPEN to anyone with the URL')
  if (!store.isPersistent()) console.warn('[warn] DATA_DIR is not a persistent volume — board data will reset on redeploy')
  // Warm the repo cache on boot, then keep it fresh.
  refreshRepos().catch(() => {})
  setInterval(() => refreshRepos().catch(() => {}), REFRESH_MS)
})
