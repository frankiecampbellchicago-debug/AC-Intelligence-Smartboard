/** Tiny className combiner (no clsx dependency needed). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Open a web URL in the system browser via the preload bridge. */
export function openExternal(url: string): void {
  if (url) void window.api.shell.openExternal(url)
}

/** Reveal a local path in Finder/Explorer. */
export function revealPath(path: string): void {
  if (path) void window.api.shell.showItemInFolder(path)
}

/** Human-friendly relative time, e.g. "3h ago". */
export function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(ts).toLocaleDateString()
}

export const ACCENT_VAR: Record<string, string> = {
  blue: 'var(--accent)',
  green: 'var(--green)',
  red: 'var(--red)',
  purple: 'var(--purple)',
  amber: 'var(--amber)',
  cyan: 'var(--cyan)',
  emerald: 'var(--emerald)'
}
