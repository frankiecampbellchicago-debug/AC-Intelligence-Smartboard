/**
 * AC Intelligence Smartboard — Terminal Backend
 *
 * Provides a WebSocket endpoint that spawns node-pty shell sessions
 * and forwards I/O between the browser and the PTY.
 *
 * Deploy to Railway: set Root Directory = backend, then Railway auto-runs `npm start`.
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

const PORT = parseInt(process.env.PORT ?? '3001', 10)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }))

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/terminal' })

// Active PTY sessions: id → { pty, ws }
const sessions = new Map()

function getShell() {
  if (process.platform === 'win32') return process.env.COMSPEC ?? 'cmd.exe'
  return process.env.SHELL ?? '/bin/bash'
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  console.log(`[ws] client connected from ${clientIp}`)

  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }

    if (msg.type === 'create') {
      const id = randomUUID()
      const cols = Math.max(10, Math.min(300, Number(msg.cols) || 80))
      const rows = Math.max(5, Math.min(100, Number(msg.rows) || 24))
      const cwd = (typeof msg.cwd === 'string' && msg.cwd) ? msg.cwd : os.homedir()
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
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'data', id, data }))
        }
      })

      ptyProcess.onExit(() => {
        sessions.delete(id)
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', id }))
        }
        console.log(`[pty] session ${id} exited`)
      })

      ws.send(JSON.stringify({ type: 'created', id }))
      console.log(`[pty] created session ${id} (${shell} ${cols}x${rows})`)

      if (msg.runClaude) {
        ptyProcess.write('claude\r')
      }

    } else if (msg.type === 'input') {
      const session = sessions.get(msg.id)
      if (session && typeof msg.data === 'string') {
        session.pty.write(msg.data)
      }

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
    // Kill any sessions owned by this connection
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
  console.log(`AC Smartboard terminal backend listening on port ${PORT}`)
})
