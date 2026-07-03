/**
 * Shared board state — persistence + at-rest token encryption.
 *
 * Stores one JSON document at $DATA_DIR/board.json (atomic temp→rename writes,
 * mirroring the Electron app's store discipline). GitHub PATs are encrypted
 * with AES-256-GCM and NEVER returned to any client — only decrypted in-memory
 * on the server to call the GitHub API.
 *
 * Env:
 *   DATA_DIR        directory for board.json (Railway volume mount; default /data)
 *   ENCRYPTION_KEY  32-byte key, hex (64 chars) or base64 — REQUIRED to store tokens
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = process.env.DATA_DIR || '/data'
const FILE = path.join(DATA_DIR, 'board.json')
const TMP = FILE + '.tmp'

const EMPTY = {
  accounts: [], // [{ login, tokenEnc, addedAt }]
  repos: [], // cached, refreshed by the server
  store: { schemaVersion: 2, projects: [] },
  whiteboard: { items: [] },
  updatedAt: 0
}

// ── AES-256-GCM ──────────────────────────────────────────────────────────

function getKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY not set — refusing to store GitHub tokens')
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must decode to exactly 32 bytes')
  return key
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

function decrypt(blob) {
  const [ivB, tagB, dataB] = String(blob).split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB, 'base64')), decipher.final()]).toString('utf8')
}

// ── Atomic JSON persistence (with in-process cache) ────────────────────────

let cache = null

function load() {
  if (cache) return cache
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'))
    cache = { ...structuredClone(EMPTY), ...parsed }
  } catch {
    cache = structuredClone(EMPTY)
  }
  return cache
}

function save(next) {
  cache = next
  cache.updatedAt = Date.now()
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch { /* dir may already exist */ }
  fs.writeFileSync(TMP, JSON.stringify(cache))
  fs.renameSync(TMP, FILE)
  return cache
}

/** True when DATA_DIR is a real, writable persistent mount (else data is ephemeral). */
function isPersistent() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.accessSync(DATA_DIR, fs.constants.W_OK)
    return DATA_DIR !== require('os').tmpdir()
  } catch {
    return false
  }
}

module.exports = { load, save, encrypt, decrypt, isPersistent, EMPTY, FILE, DATA_DIR }
