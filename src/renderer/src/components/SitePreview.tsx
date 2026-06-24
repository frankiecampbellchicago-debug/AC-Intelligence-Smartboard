import { useEffect, useRef, useState } from 'react'

const BASE_W = 1280

function domain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

/**
 * Live site thumbnail. In Electron uses <webview> (bypasses X-Frame-Options).
 * In the browser, fetches a screenshot via image.thum.io (no API key needed).
 */
export function SitePreview({
  url,
  height = 168
}: {
  url: string
  height?: number
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isElectron = (window as { api?: { platform?: string } }).api?.platform !== 'web'
  const scale = w > 0 ? w / BASE_W : 0
  const baseH = scale > 0 ? height / scale : height

  if (!url) {
    return (
      <div ref={ref} className="flex w-full items-center justify-center bg-surface-2 text-xs text-subtle" style={{ height }}>
        No live URL
      </div>
    )
  }

  /* ── Electron: native <webview> bypasses X-Frame-Options ── */
  if (isElectron) {
    return (
      <div ref={ref} className="relative w-full overflow-hidden bg-bg" style={{ height }}>
        {scale > 0 && (
          <webview
            src={url}
            partition="sitepreview"
            style={{
              position: 'absolute', top: 0, left: 0,
              width: BASE_W, height: baseH, border: '0',
              transform: `scale(${scale})`, transformOrigin: 'top left',
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
    )
  }

  /* ── Web: screenshot via image.thum.io ── */
  const thumbUrl = `https://image.thum.io/get/width/1280/crop/${Math.round(baseH > 0 ? baseH : 800)}/${url}`

  return (
    <div ref={ref} className="relative w-full overflow-hidden bg-surface-2" style={{ height }}>
      {!imgError ? (
        <img
          src={thumbUrl}
          alt={domain(url)}
          className="absolute inset-0 h-full w-full object-cover object-top"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Fallback: styled placeholder when screenshot fails */
        <div className="flex h-full flex-col items-center justify-center gap-1.5 bg-surface-2 px-4 text-center">
          <span className="text-xs font-medium text-muted">{domain(url)}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-accent underline underline-offset-2"
          >
            Open site ↗
          </a>
        </div>
      )}
    </div>
  )
}
