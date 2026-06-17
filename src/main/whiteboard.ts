import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'

/**
 * Whiteboard backend: OpenRouter image generation ("nano banana" Gemini family),
 * image-to-disk saving, whiteboard persistence, and local API-key storage.
 * The key lives only on this machine (env var or a userData file) — never in the
 * renderer or the repo. The renderer only ever learns whether a key is present.
 */

const dataDir = app.getPath('userData')
const KEY_FILE = join(dataDir, 'openrouter.key')
const WB_FILE = join(dataDir, 'whiteboard.json')
const IMG_DIR = join(homedir(), 'website-cookbook-sites', 'whiteboard')

const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'

export function getApiKey(): string {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY
  try {
    if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, 'utf-8').trim()
  } catch {
    /* ignore */
  }
  return ''
}

export function setApiKey(key: string): void {
  try {
    writeFileSync(KEY_FILE, key.trim(), 'utf-8')
  } catch {
    /* ignore */
  }
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey())
}

export async function generateImage(prompt: string): Promise<{ dataUrl?: string; error?: string }> {
  const key = getApiKey()
  if (!key) return { error: 'No OpenRouter API key. Add one in Settings.' }
  if (!prompt.trim()) return { error: 'Empty prompt.' }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text']
      })
    })
    if (!res.ok) {
      return { error: `OpenRouter ${res.status}: ${(await res.text()).slice(0, 160)}` }
    }
    const data = (await res.json()) as {
      choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[]
    }
    const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
    if (!url) return { error: 'No image returned by the model.' }
    return { dataUrl: url }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export function saveImage(dataUrl: string, name: string): { path?: string; error?: string } {
  try {
    if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true })
    const m = /^data:image\/(\w+);base64,(.+)$/s.exec(dataUrl)
    if (!m) return { error: 'Not a base64 image.' }
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1]
    const safe = (name.replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40) || 'image').toLowerCase()
    const path = join(IMG_DIR, `${safe}-${Date.now()}.${ext}`)
    writeFileSync(path, Buffer.from(m[2], 'base64'))
    return { path }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export function readWhiteboard(): unknown {
  try {
    if (existsSync(WB_FILE)) return JSON.parse(readFileSync(WB_FILE, 'utf-8'))
  } catch {
    /* corrupt → empty */
  }
  return { items: [] }
}

export function writeWhiteboard(data: unknown): void {
  try {
    writeFileSync(WB_FILE, JSON.stringify(data), 'utf-8')
  } catch {
    /* best-effort */
  }
}
