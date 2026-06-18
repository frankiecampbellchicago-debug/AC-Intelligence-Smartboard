import { DEFAULT_LEADS_SHEET_ID, type Lead, type LeadsResult } from '../shared/types'

/**
 * Reads the combined leads Google Sheet live and returns parsed rows.
 *
 * The renderer's production CSP is `connect-src 'self'`, so the network read
 * happens here in the main process (not CSP-bound, and no CORS). We hit the
 * sheet's CSV export endpoint, which requires the sheet to be shared to
 * "anyone with the link" — when it isn't, Google serves an HTML sign-in page
 * instead of CSV, which we detect and surface as 'not-accessible'.
 */

/** Accept a raw sheet id or any Google Sheets URL and return the bare id. */
export function extractSheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return (m ? m[1] : input).trim()
}

/** Minimal RFC-4180 CSV parser: quoted fields, escaped "" quotes, embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function rowToLead(r: string[]): Lead {
  const g = (i: number): string => (r[i] ?? '').trim()
  return {
    business: g(0),
    phone: g(1),
    rating: g(2),
    reviewCount: g(3),
    location: g(4),
    websiteStatus: g(5),
    niche: g(6),
    dateAdded: g(7),
    called: g(8),
    outcome: g(9),
    followUp: g(10),
    notes: g(11)
  }
}

export async function fetchLeads(sheetId?: string): Promise<LeadsResult> {
  const id = extractSheetId(sheetId || DEFAULT_LEADS_SHEET_ID)
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const body = await res.text()
    const ct = res.headers.get('content-type') || ''
    if (!res.ok || ct.includes('text/html') || body.trimStart().startsWith('<')) {
      return { leads: [], sheetId: id, error: 'not-accessible' }
    }
    const rows = parseCsv(body).filter((r) => r.some((c) => c.trim() !== ''))
    if (rows.length <= 1) return { leads: [], sheetId: id }
    // Drop the header row; keep only rows with a business name.
    const leads = rows
      .slice(1)
      .map(rowToLead)
      .filter((l) => l.business !== '')
    return { leads, sheetId: id }
  } catch (e) {
    return { leads: [], sheetId: id, error: e instanceof Error ? e.message : 'fetch-failed' }
  }
}
