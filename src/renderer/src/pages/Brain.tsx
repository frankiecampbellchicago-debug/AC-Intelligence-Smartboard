import { useEffect, useRef, useState } from 'react'
import { Card } from '../components/ui'
import { cn } from '../lib/util'
import { bridgeOnline, fetchVaultTree, fetchVaultFile, type VaultNode } from '../lib/bridge'

/** Aurora particle orb — the brain visual, scaled to how much the vault knows. */
function Orb({ notes }: { notes: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = (canvas.width = 260)
    const H = (canvas.height = 260)
    const N = Math.min(360, 90 + notes * 3)
    const pts = [...Array(N)].map(() => {
      const t = Math.acos(2 * Math.random() - 1)
      const p = Math.random() * Math.PI * 2
      return { t, p, r: 78 + Math.random() * 14, s: 0.6 + Math.random() * 1.6 }
    })
    let raf = 0
    let a = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (): void => {
      a += 0.0035
      ctx.clearRect(0, 0, W, H)
      for (const pt of pts) {
        const x3 = pt.r * Math.sin(pt.t) * Math.cos(pt.p + a)
        const z3 = pt.r * Math.sin(pt.t) * Math.sin(pt.p + a)
        const y3 = pt.r * Math.cos(pt.t)
        const depth = (z3 + pt.r) / (2 * pt.r)
        const x = W / 2 + x3
        const y = H / 2 + y3 * 0.92
        const hue = depth > 0.6 ? '167,155,255' : depth > 0.3 ? '213,122,232' : '127,227,240'
        ctx.beginPath()
        ctx.arc(x, y, pt.s * (0.5 + depth), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hue},${0.22 + depth * 0.66})`
        ctx.fill()
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [notes])
  return <canvas ref={ref} className="mx-auto block" style={{ width: 260, height: 260 }} aria-hidden="true" />
}

function Tree({ nodes, onOpen, depth = 0 }: { nodes: VaultNode[]; onOpen: (p: string) => void; depth?: number }): React.JSX.Element {
  return (
    <div className={cn(depth > 0 && 'ml-3 border-l border-border pl-2')}>
      {nodes.map((n) =>
        n.type === 'dir' ? (
          <details key={n.path} open={depth === 0}>
            <summary className="cursor-pointer select-none py-0.5 text-[13px] font-semibold text-muted hover:text-text">
              {n.name}/
            </summary>
            <Tree nodes={n.children ?? []} onOpen={onOpen} depth={depth + 1} />
          </details>
        ) : (
          <button
            key={n.path}
            onClick={() => onOpen(n.path)}
            className="block w-full truncate rounded px-1 py-0.5 text-left text-[12.5px] text-subtle transition hover:bg-accent-soft hover:text-text"
          >
            {n.name}
          </button>
        )
      )}
    </div>
  )
}

export function Brain(): React.JSX.Element {
  const [online, setOnline] = useState<boolean | null>(null)
  const [notes, setNotes] = useState(0)
  const [tree, setTree] = useState<VaultNode[]>([])
  const [file, setFile] = useState<{ path: string; content: string } | null>(null)

  useEffect(() => {
    void (async () => {
      const ok = await bridgeOnline()
      setOnline(ok)
      if (ok) {
        const t = await fetchVaultTree()
        if (t) { setTree(t.tree); setNotes(t.notes) }
      }
    })()
  }, [])

  async function open(p: string): Promise<void> {
    setFile((await fetchVaultFile(p)) ?? null)
  }

  return (
    <div className="rise-in mx-auto max-w-5xl space-y-5">
      <div>
        <p className="eyebrow mb-2">System</p>
        <h1 className="font-display text-2xl font-bold text-text">The Brain</h1>
        <p className="mt-1 text-sm text-muted">
          Your vault — runbooks, incidents, run logs, WIP — read straight from <code className="rounded bg-white/[0.06] px-1 text-xs text-cyan">~/vault</code>. Read-only.
        </p>
      </div>

      {online === false && (
        <Card className="p-5" interactive={false}>
          <p className="text-sm text-muted">
            The brain lives on the Mac — start the bridge:{' '}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 text-xs text-cyan">cd ~/agentic-os/dashboard && node server.mjs</code>
          </p>
        </Card>
      )}

      {online && (
        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="p-4 lg:col-span-2" interactive={false}>
            <Orb notes={notes} />
            <div className="mt-1 text-center">
              <span className="tnum font-display text-lg font-bold text-text">{notes}</span>
              <span className="ml-1.5 text-[11px] uppercase tracking-[0.16em] text-subtle">notes in the vault</span>
            </div>
            <div className="mt-4 max-h-[380px] overflow-y-auto pr-1">
              <Tree nodes={tree} onOpen={(p) => void open(p)} />
            </div>
          </Card>
          <Card className="p-5 lg:col-span-3" interactive={false}>
            {file ? (
              <>
                <div className="mb-3 border-b border-border pb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  {file.path}
                </div>
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap font-[ui-monospace,SF_Mono,Menlo,monospace] text-[12.5px] leading-relaxed text-muted">
                  {file.content}
                </pre>
              </>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted">
                Open a note from the vault.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
