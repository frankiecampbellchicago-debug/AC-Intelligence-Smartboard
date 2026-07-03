import { useEffect, useState } from 'react'
import { Card, Button } from './ui'
import { loginRequired, checkSession, login } from '../lib/auth'

type Phase = 'checking' | 'authed' | 'login'

/**
 * Wraps the app. In web mode with a login-gated backend, shows a sign-in screen
 * until a valid session exists; everywhere else it renders children immediately.
 * A remembered session skips the form entirely (quick access for return visits).
 */
export function LoginGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [phase, setPhase] = useState<Phase>('checking')

  useEffect(() => {
    let active = true
    void (async () => {
      const required = await loginRequired()
      if (!active) return
      if (!required) {
        setPhase('authed')
        return
      }
      const ok = await checkSession()
      if (!active) return
      setPhase(ok ? 'authed' : 'login')
    })()
    return () => {
      active = false
    }
  }, [])

  if (phase === 'authed') return <>{children}</>
  if (phase === 'checking') {
    return <div className="flex h-screen items-center justify-center bg-bg text-sm text-muted">Loading…</div>
  }
  return <LoginForm onSuccess={() => setPhase('authed')} />
}

function LoginForm({ onSuccess }: { onSuccess: () => void }): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await login(username.trim(), password, remember)
    setBusy(false)
    if (res.ok) onSuccess()
    else setError(res.error || 'Login failed')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-text">AC Intelligence Smartboard</h1>
        <p className="mt-1 text-sm text-muted">Sign in to continue.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            autoFocus
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
          <label className="flex select-none items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me on this device
          </label>
          {error && <p className="text-sm font-medium text-red">{error}</p>}
          <Button type="submit" disabled={busy || !username.trim() || !password} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
