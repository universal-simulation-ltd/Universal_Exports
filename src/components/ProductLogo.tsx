// GENERATED FILE — do not edit by hand.
// Source: backoffice/universal-platform/scripts/app-marks/marks.mjs
// Regenerate: node scripts/app-marks/build.mjs (from backoffice/universal-platform)
// Mark: Universal Exports — A globe, and something leaving it.
// Hover: The export leaves the globe.
//
// Icon-only by design: the SDK's UniversalAppsNavBar renders the product name
// from its catalogue beside this slot, so a wordmark here would print it twice.

const CSS = `
  /* Resting states */
  .uam-exports-arrow { transform: translate(-5px, 5px); opacity: 0.4; transition: transform .5s cubic-bezier(0.16,1,0.3,1), opacity .4s ease; }

  /* Active states */
  .uam-host-exports:hover .uam-exports-arrow,
  .uam-host-exports:focus-visible .uam-exports-arrow { transform: translate(0, 0); opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .uam-exports-arrow { transition: none !important; }
  }
`

export default function ProductLogo() {
  return (
    <span
      className="uam-host-exports inline-flex h-6 w-6 shrink-0 items-center justify-center"
      aria-hidden="true"
    >
      <style>{CSS}</style>
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
        <defs>
          <linearGradient id="uam-nav-exports-tile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fe8c01" />
            <stop offset="1" stopColor="#e05504" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#uam-nav-exports-tile)" />
        <circle cx={27} cy={36} r={13} fill="none" strokeWidth={2.8} stroke="#ffffff" />
        <g fill="none" opacity={0.6} strokeLinecap="round" strokeLinejoin="round" stroke="#ffffff">
          <ellipse cx={27} cy={36} rx={13} ry={4.6} strokeWidth={1.6} />
          <line x1={27} y1={23} x2={27} y2={49} strokeWidth={1.6} />
          <path d="M27 23c4.6 3.6 4.6 22.4 0 26" strokeWidth={1.6} />
          <path d="M27 23c-4.6 3.6-4.6 22.4 0 26" strokeWidth={1.6} />
        </g>
        <g fill="none" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" stroke="#ffffff" className="uam-exports-arrow">
          <path d="M40 22 L54 8" />
          <path d="M44 8 L54 8 L54 18" />
        </g>
      </svg>
    </span>
  )
}
