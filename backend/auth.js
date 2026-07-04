/**
 * Login gate — per-user auth with stateless, signed session tokens.
 *
 * Users are defined via the USERS env var (JSON array), each with a scrypt
 * password hash (generate with `node hash-password.js`). Passwords are never
 * stored in plaintext and never leave the server. Session tokens are HMAC-signed
 * (SESSION_SECRET) and stateless, so they survive restarts and multiple instances.
 *
 * Env:
 *   USERS           JSON: [{ "username": "kaiden", "passwordHash": "scrypt$..." }, ...]
 *   SESSION_SECRET  long random string used to sign session tokens
 */

const crypto = require('crypto')

const SESSION_SECRET = process.env.SESSION_SECRET || ''
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SESSION_MS = 12 * 60 * 60 * 1000 // 12 hours

function users() {
  try {
    const arr = JSON.parse(process.env.USERS || '[]')
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/** True once at least one user AND a session secret are configured. */
function gateConfigured() {
  return Boolean(SESSION_SECRET && users().length)
}

// ── Password hashing (scrypt, no native deps) ──────────────────────────────

function hashPassword(pw) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(String(pw), salt, 32)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

function verifyPassword(pw, stored) {
  try {
    const [scheme, saltB, hashB] = String(stored).split('$')
    if (scheme !== 'scrypt') return false
    const salt = Buffer.from(saltB, 'base64')
    const expected = Buffer.from(hashB, 'base64')
    const actual = crypto.scryptSync(String(pw), salt, expected.length)
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function authenticate(username, password) {
  const u = users().find((x) => x && x.username === username)
  if (!u) {
    // Do comparable work so a missing user isn't distinguishable by timing.
    crypto.scryptSync(String(password || ''), 'timing-equalizer', 32)
    return false
  }
  return verifyPassword(password, u.passwordHash)
}

// ── Session tokens (HMAC-signed, stateless) ────────────────────────────────

function sign(payloadB64) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url')
}

function issueToken(username, remember) {
  if (!SESSION_SECRET) throw new Error('SESSION_SECRET not set')
  const exp = Date.now() + (remember ? REMEMBER_MS : SESSION_MS)
  const payloadB64 = Buffer.from(JSON.stringify({ u: username, exp })).toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

function verifyToken(token) {
  if (!SESSION_SECRET || !token) return null
  const [payloadB64, sig] = String(token).split('.')
  if (!payloadB64 || !sig) return null
  const expected = sign(payloadB64)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const { u, exp } = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (!u || !exp || Date.now() > exp) return null
    return { username: u }
  } catch {
    return null
  }
}

module.exports = {
  gateConfigured,
  hashPassword,
  authenticate,
  issueToken,
  verifyToken,
  REMEMBER_MS,
  SESSION_MS
}
