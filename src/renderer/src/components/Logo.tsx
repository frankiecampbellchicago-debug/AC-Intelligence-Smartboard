/**
 * Website Cookbook brand mark: a gradient tile with three ascending bars
 * (the 7-level climb) topped by a spark. Distinctive and on-theme.
 */
export function Logo({ size = 36 }: { size?: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      className="ring-brand rounded-[10px]"
    >
      <defs>
        <linearGradient id="wc-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-from)" />
          <stop offset="0.5" stopColor="var(--brand-via)" />
          <stop offset="1" stopColor="var(--brand-to)" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#wc-grad)" />
      <rect x="8.5" y="20" width="4.5" height="7.5" rx="2.25" fill="#fff" fillOpacity="0.78" />
      <rect x="15.75" y="15.5" width="4.5" height="12" rx="2.25" fill="#fff" fillOpacity="0.9" />
      <rect x="23" y="11" width="4.5" height="16.5" rx="2.25" fill="#fff" />
      <path
        d="M25.25 4.2l.9 2.05 2.05.9-2.05.9-.9 2.05-.9-2.05-2.05-.9 2.05-.9z"
        fill="#fff"
      />
    </svg>
  )
}
