/**
 * Dark only — the Smartboard ships in the AC Intelligence brand theme.
 * The hook API is preserved so existing callers keep compiling, but the
 * theme is permanently dark and setPref is a no-op.
 */
export type ThemePref = 'light' | 'dark' | 'system'

export function resolveIsDark(_pref?: ThemePref): boolean {
  return true
}

export function useTheme(): {
  pref: ThemePref
  isDark: boolean
  setPref: (p: ThemePref) => void
} {
  return { pref: 'dark', isDark: true, setPref: () => {} }
}
