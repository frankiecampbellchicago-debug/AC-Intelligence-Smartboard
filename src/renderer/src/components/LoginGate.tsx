import { useEffect, useState } from 'react'
import { loginRequired, checkSession, login } from '../lib/auth'
import loginHero from '../assets/login-hero.jpg'

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
    return (
      <div className="flex h-screen items-center justify-center bg-[#08090c]">
        <BrandMark className="h-7 w-7 opacity-70" />
      </div>
    )
  }
  return <LoginForm onSuccess={() => setPhase('authed')} />
}

/** The site's orbit emblem — ring + orbiting dot. */
function BrandMark({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`brand-orbit ${className ?? ''}`}>
      <circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,.82)" strokeWidth="1.5" />
      <circle cx="12" cy="4" r="2.1" fill="#fff" />
    </svg>
  )
}

function Field({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  )
}

const INPUT_CLASS =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[15px] text-white ' +
  'placeholder:text-white/25 outline-none backdrop-blur-sm transition ' +
  'focus:border-white/45 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.08)]'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#08090c] px-4">
      {/* Generated twilight-valley backdrop — mirrors the ac-intelligence hero. */}
      <img
        src={loginHero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Site-style scrims: darken edges, keep the valley luminous, guarantee text contrast. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(8,9,12,.55) 0%, rgba(8,9,12,.18) 30%, rgba(8,9,12,.28) 62%, rgba(8,9,12,.82) 100%),' +
            'radial-gradient(ellipse 90% 70% at 50% 42%, transparent, rgba(8,9,12,.42))'
        }}
      />

      <div className="rise-in relative z-10 w-full max-w-[400px]">
        {/* Brand row */}
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <BrandMark className="h-[22px] w-[22px]" />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            AC Intelligence
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/12 bg-[#0b0d12]/60 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <p className="eyebrow text-white/60">Ops Hub Access</p>
          <h1 className="font-display mt-3 text-[26px] font-bold leading-tight text-white">
            Sign in to the Smartboard
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">
            The screen we run our own shop from.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Username">
              <input
                autoFocus
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                autoComplete="current-password"
                className={INPUT_CLASS}
              />
            </Field>

            <label className="flex cursor-pointer select-none items-center gap-2.5 pt-1 text-[13px] text-white/55 transition hover:text-white/80">
              <span className="relative inline-flex h-[18px] w-[18px] items-center justify-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer h-[18px] w-[18px] appearance-none rounded-[5px] border border-white/25 bg-white/[0.04] transition checked:border-white checked:bg-white"
                />
                <svg
                  viewBox="0 0 12 12"
                  className="pointer-events-none absolute h-[11px] w-[11px] opacity-0 transition peer-checked:opacity-100"
                  fill="none"
                  stroke="#07080a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 6.2 4.8 9 10 3.4" />
                </svg>
              </span>
              Keep me signed in on this device
            </label>

            {error && (
              <p className="rounded-lg border border-red/25 bg-red/10 px-3 py-2 text-[13px] font-medium text-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !username.trim() || !password}
              className="mt-1 w-full rounded-[4px] bg-white py-3 text-[15px] font-semibold text-[#07080a] transition
                         duration-200 will-change-transform hover:-translate-y-0.5
                         hover:shadow-[0_16px_34px_-14px_rgba(255,255,255,0.45)]
                         disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {busy ? 'Signing in…' : 'Enter the Smartboard'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.14em] text-white/35">
          AC INTELLIGENCE · INTERNAL OPERATIONS
        </p>
      </div>
    </div>
  )
}
