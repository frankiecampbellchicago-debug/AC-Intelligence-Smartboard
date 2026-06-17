import { useEffect, useRef, useState } from 'react'

const BASE_W = 1280

/**
 * Live thumbnail of a website: an Electron <webview> rendered at desktop width
 * (1280px) and scaled down to fit the card. Non-interactive — the parent card
 * handles clicks. Works even for sites that block iframing (webview ≠ iframe).
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

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = w > 0 ? w / BASE_W : 0
  const baseH = scale > 0 ? height / scale : height

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-bg"
      style={{ height }}
    >
      {url && scale > 0 ? (
        <webview
          src={url}
          partition="sitepreview"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: BASE_W,
            height: baseH,
            border: '0',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none'
          }}
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-subtle">
          {url ? 'Loading…' : 'No live URL'}
        </div>
      )}
    </div>
  )
}
