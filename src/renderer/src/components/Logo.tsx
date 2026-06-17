import acLogo from '../assets/ac-logo.png'

/**
 * AC Intelligence brand mark — the neon brain, keyed to transparent so it
 * glows directly on the dark sidebar.
 */
export function Logo({ size = 40 }: { size?: number }): React.JSX.Element {
  return (
    <img
      src={acLogo}
      width={size}
      height={size}
      alt="AC Intelligence"
      className="object-contain"
      draggable={false}
    />
  )
}
