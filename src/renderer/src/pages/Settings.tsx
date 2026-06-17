import { useState } from 'react'
import { Card, Button } from '../components/ui'
import { useTheme, type ThemePref } from '../lib/theme'
import { cn } from '../lib/util'
import { useStore } from '../store/useStore'
import { IconGit, IconCheck } from '../components/icons'

const THEMES: { id: ThemePref; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' }
]

function GithubCard(): React.JSX.Element {
  const status = useStore((s) => s.githubStatus)
  const syncing = useStore((s) => s.githubSyncing)
  const checkGithub = useStore((s) => s.checkGithub)
  const syncFromGitHub = useStore((s) => s.syncFromGitHub)
  const setView = useStore((s) => s.setView)
  const [result, setResult] = useState<string | null>(null)

  const connected = status?.connected
  const reason = status?.reason

  async function sync(): Promise<void> {
    setResult(null)
    const { added, updated, removed } = await syncFromGitHub()
    const parts = [`${added} added`, `${updated} updated`]
    if (removed > 0) parts.push(`${removed} removed (no live site)`)
    setResult(`Synced — ${parts.join(', ')}.`)
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-text/5 text-text">
          <IconGit className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text">GitHub</h3>
          {connected ? (
            <p className="mt-0.5 text-sm text-muted">
              Connected as{' '}
              <span className="font-medium text-emerald">@{status?.login}</span> via the{' '}
              <code className="rounded bg-bg px-1 py-0.5 text-xs">gh</code> CLI — no token stored.
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted">
              {reason === 'gh-not-found'
                ? 'GitHub CLI not found. Install it (brew install gh) and run `gh auth login`.'
                : reason === 'not-authenticated'
                  ? 'GitHub CLI found but not logged in. Run `gh auth login` in your terminal.'
                  : 'Checking connection…'}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={sync} disabled={!connected || syncing}>
              {syncing ? 'Syncing…' : 'Sync repositories'}
            </Button>
            {connected && (
              <Button variant="subtle" onClick={() => setView('projects')}>
                View sites
              </Button>
            )}
            {!connected && (
              <Button variant="ghost" onClick={() => void checkGithub()}>
                Recheck
              </Button>
            )}
          </div>

          {result && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald">
              <IconCheck className="h-4 w-4" /> {result}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export function Settings(): React.JSX.Element {
  const { pref, setPref } = useTheme()
  const count = useStore((s) => s.projects.length)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <GithubCard />
      <Card className="p-6">
        <h3 className="font-semibold text-text">Appearance</h3>
        <p className="mb-4 mt-1 text-sm text-muted">Choose how Website Cookbook looks.</p>
        <div className="inline-flex rounded-xl border border-border bg-bg p-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPref(t.id)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition',
                pref === t.id ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-text">Your data</h3>
        <p className="mt-1 text-sm text-muted">
          You're tracking <span className="font-semibold text-text">{count}</span>{' '}
          {count === 1 ? 'site' : 'sites'}. Everything is stored locally on your Mac with atomic,
          backed-up writes — nothing leaves your machine.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-text">About</h3>
        <p className="mt-1 text-sm text-muted">
          Website Cookbook — your personal hub for building websites with the 7-level method.
        </p>
        <div className="mt-3 text-xs text-subtle">Version 0.1.0</div>
      </Card>
    </div>
  )
}
