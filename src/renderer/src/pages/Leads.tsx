import { useEffect, useMemo, useState } from 'react'
import type { Lead } from '@shared/types'
import { DEFAULT_LEADS_SHEET_ID } from '@shared/types'
import { openExternal, cn } from '../lib/util'
import { Button } from '../components/ui'
import {
  IconRefresh,
  IconExternal,
  IconSearch,
  IconCheck,
  IconAlert,
  IconPhone,
  IconLeads,
  IconGlobe
} from '../components/icons'

const sheetEditUrl = (id: string): string => `https://docs.google.com/spreadsheets/d/${id}/edit`

/** A lead counts as "called" when the Called? column is an affirmative. */
function isCalled(l: Lead): boolean {
  const v = l.called.trim().toLowerCase()
  return v === 'y' || v === 'yes' || v === 'true' || v === '✓' || v === 'x' || v === 'done'
}

/** Pull a bare domain out of the Website Status column when it holds one (Chicago rows). */
function domainOf(l: Lead): string | null {
  const m = l.websiteStatus.trim().match(/^([a-z0-9-]+\.)+[a-z]{2,}$/i)
  return m ? m[0] : null
}

// Phone-keypad letter → digit (handles vanity numbers like "(312) 850-HOME").
const KEYPAD: Record<string, string> = {
  a: '2', b: '2', c: '2', d: '3', e: '3', f: '3', g: '4', h: '4', i: '4',
  j: '5', k: '5', l: '5', m: '6', n: '6', o: '6', p: '7', q: '7', r: '7', s: '7',
  t: '8', u: '8', v: '8', w: '9', x: '9', y: '9', z: '9'
}

/** Build a dialable tel: URI from a messy phone string, or null if there aren't enough digits. */
function telHref(phone: string): string | null {
  let digits = ''
  for (const ch of phone.toLowerCase()) {
    if (ch >= '0' && ch <= '9') digits += ch
    else if (KEYPAD[ch]) digits += KEYPAD[ch]
  }
  if (digits.length < 7) return null
  if (digits.length === 10) digits = `1${digits}` // assume US/Canada
  return `tel:+${digits}`
}

/* ------------------------------- small bits ------------------------------- */

function Stat({
  label,
  value,
  accent
}: {
  label: string
  value: number
  accent?: string
}): React.JSX.Element {
  return (
    <div className="widget rounded-2xl px-5 py-4">
      <div
        className="font-display tnum text-2xl font-bold text-text"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-subtle">
        {label}
      </div>
    </div>
  )
}

/* ------------------------------ business card ----------------------------- */

function LeadCard({ lead }: { lead: Lead }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const tel = telHref(lead.phone)
  const domain = domainOf(lead)
  const called = isCalled(lead)

  return (
    <div className="widget flex flex-col rounded-2xl p-4">
      {/* title + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-bold tracking-tight text-text">{lead.business}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            {lead.niche && (
              <span className="rounded-full bg-violet/10 px-2 py-0.5 font-semibold text-[var(--violet)]">
                {lead.niche}
              </span>
            )}
            {lead.location && <span className="text-muted">{lead.location}</span>}
            {lead.rating && (
              <span className="tabular-nums text-muted">
                <span className="text-amber">★</span> {lead.rating}
                {lead.reviewCount && <span className="text-subtle"> · {lead.reviewCount}</span>}
              </span>
            )}
          </div>
        </div>
        {called ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald/15 px-2 py-0.5 text-[11px] font-semibold text-emerald">
            <IconCheck className="h-3 w-3" /> Called
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[11px] font-medium text-subtle">
            New
          </span>
        )}
      </div>

      {/* outreach context */}
      {lead.notes && (
        <p className="mt-2 line-clamp-3 text-[12.5px] leading-snug text-muted" title={lead.notes}>
          {lead.notes}
        </p>
      )}

      {/* spacer pushes actions to the bottom for a tidy grid */}
      <div className="flex-1" />

      {/* actions */}
      <div className="mt-3 flex items-center gap-2">
        {tel ? (
          <button
            onClick={() => openExternal(tel)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-[4px] bg-ink px-4 py-2.5 text-sm font-semibold text-[var(--ink-fg)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(255,255,255,0.4)]"
            title={`Call ${lead.phone}`}
          >
            <IconPhone className="h-4 w-4" /> Call {lead.phone}
          </button>
        ) : (
          <span className="flex-1 rounded-full bg-bg px-4 py-2.5 text-center text-sm text-subtle">
            No phone number
          </span>
        )}

        {lead.phone && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(lead.phone)
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            }}
            title="Copy number"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition hover:text-text"
          >
            {copied ? <IconCheck className="h-4 w-4 text-emerald" /> : <CopyGlyph />}
          </button>
        )}

        {domain && (
          <button
            onClick={() => openExternal(`https://${domain}`)}
            title={`Visit ${domain}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-muted transition hover:border-accent hover:text-accent"
          >
            <IconGlobe className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function CopyGlyph(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

/* --------------------------------- page ---------------------------------- */

export function Leads(): React.JSX.Element {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sheetId, setSheetId] = useState(DEFAULT_LEADS_SHEET_ID)
  const [q, setQ] = useState('')
  const [niche, setNiche] = useState('all')
  const [onlyUncalled, setOnlyUncalled] = useState(false)

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    const res = await window.api.leads.fetch()
    setSheetId(res.sheetId)
    if (res.error) setError(res.error)
    setLeads(res.leads)
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [])

  const niches = useMemo(
    () => Array.from(new Set(leads.map((l) => l.niche).filter(Boolean))).sort(),
    [leads]
  )

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return leads.filter((l) => {
      if (niche !== 'all' && l.niche !== niche) return false
      if (onlyUncalled && isCalled(l)) return false
      if (!needle) return true
      return [l.business, l.location, l.niche, l.notes, l.phone, l.websiteStatus]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [leads, q, niche, onlyUncalled])

  const uncalled = useMemo(() => leads.filter((l) => !isCalled(l)).length, [leads])

  /* ----------------------------- setup / error ----------------------------- */
  if (!loading && error === 'not-accessible') {
    return (
      <div className="mx-auto max-w-xl">
        <div className="widget rounded-2xl p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber/15 text-amber">
            <IconAlert className="h-6 w-6" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-text">Share the sheet to go live</h2>
          <p className="mt-1 text-sm text-muted">
            The Leads tab reads directly from your{' '}
            <strong className="text-text">AC Intelligence — Master Leads</strong> Google Sheet. To let
            this app read it, open the sheet and set link sharing to{' '}
            <strong className="text-text">Anyone with the link → Viewer</strong>.
          </p>
          <ol className="mt-4 space-y-2 text-sm text-muted">
            <li>1. Open the sheet (button below).</li>
            <li>
              2. Click <strong className="text-text">Share</strong> (top right).
            </li>
            <li>
              3. Under <em>General access</em>, choose{' '}
              <strong className="text-text">Anyone with the link</strong>, role{' '}
              <strong className="text-text">Viewer</strong>.
            </li>
            <li>
              4. Come back and hit <strong className="text-text">Refresh</strong>.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => openExternal(sheetEditUrl(sheetId))}>
              <IconExternal className="h-4 w-4" /> Open the sheet
            </Button>
            <Button variant="subtle" onClick={() => void load()}>
              <IconRefresh className="h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && error) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="widget rounded-2xl p-7 text-center">
          <h2 className="text-lg font-bold text-text">Couldn't load leads</h2>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <div className="mt-4">
            <Button variant="subtle" onClick={() => void load()}>
              <IconRefresh className="h-4 w-4" /> Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-bold tracking-tight text-text">
            <IconLeads className="h-6 w-6 text-accent" /> Leads
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Live from <span className="font-medium text-text">AC Intelligence — Master Leads</span> ·
            tap Call to dial any business.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="subtle" onClick={() => void load()} disabled={loading}>
            <IconRefresh className={cn('h-4 w-4', loading && 'animate-spin')} />
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <Button onClick={() => openExternal(sheetEditUrl(sheetId))}>
            <IconExternal className="h-4 w-4" /> Open sheet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 sm:max-w-md">
        <Stat label="Total leads" value={leads.length} />
        <Stat label="Uncalled" value={uncalled} accent="var(--accent)" />
        <Stat label="Niches" value={niches.length} accent="var(--violet)" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, niche, notes…"
            className="w-full rounded-full border border-border-strong bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent"
          />
        </div>
        <select
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          className="rounded-full border border-border-strong bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        >
          <option value="all">All niches</option>
          {niches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          onClick={() => setOnlyUncalled((v) => !v)}
          className={cn(
            'rounded-full border px-3 py-2 text-sm font-medium transition',
            onlyUncalled
              ? 'border-accent bg-accent/10 text-accent'
              : 'border-border-strong bg-surface text-muted hover:text-text'
          )}
        >
          Uncalled only
        </button>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted">Loading leads…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center text-sm text-muted">
          No leads match your filters.
        </div>
      ) : (
        <>
          <div className="text-[11px] text-subtle">
            Showing {filtered.length} of {leads.length}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l, i) => (
              <LeadCard key={`${l.business}-${i}`} lead={l} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
