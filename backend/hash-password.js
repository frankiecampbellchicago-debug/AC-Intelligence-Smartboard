#!/usr/bin/env node
/**
 * Generate a scrypt password hash for a Smartboard user.
 *
 * Usage:
 *   node hash-password.js <username> <password>
 *
 * Prints a JSON object to add to the USERS env array on Railway, e.g.
 *   USERS = [{"username":"kaiden","passwordHash":"scrypt$..."},{"username":"frankie","passwordHash":"scrypt$..."}]
 */

const { hashPassword } = require('./auth')

const [, , username, password] = process.argv
if (!username || !password) {
  console.error('Usage: node hash-password.js <username> <password>')
  process.exit(1)
}

console.log(JSON.stringify({ username, passwordHash: hashPassword(password) }))
