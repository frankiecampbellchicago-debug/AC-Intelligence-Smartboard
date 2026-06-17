import { useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'wc-theme'

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveIsDark(pref: ThemePref): boolean {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark())
}

function readPref(): ThemePref {
  const t = localStorage.getItem(KEY)
  return t === 'light' || t === 'dark' || t === 'system' ? t : 'system'
}

function apply(pref: ThemePref): void {
  document.documentElement.classList.toggle('dark', resolveIsDark(pref))
}

/** Single source of truth for the theme, persisted to localStorage + main process. */
export function useTheme(): {
  pref: ThemePref
  isDark: boolean
  setPref: (p: ThemePref) => void
} {
  const [pref, setPrefState] = useState<ThemePref>(() => readPref())
  const [isDark, setIsDark] = useState<boolean>(() => resolveIsDark(readPref()))

  useEffect(() => {
    apply(pref)
    setIsDark(resolveIsDark(pref))
    localStorage.setItem(KEY, pref)
    // mirror to main so the next launch paints the right window background
    void window.api?.settings?.setTheme(pref)
  }, [pref])

  // react to OS theme changes while in "system" mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => {
      if (readPref() === 'system') {
        apply('system')
        setIsDark(systemPrefersDark())
      }
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return { pref, isDark, setPref: setPrefState }
}
