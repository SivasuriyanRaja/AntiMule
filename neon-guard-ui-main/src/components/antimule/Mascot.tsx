export function ShieldMascot({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="shieldG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.21 256)" />
          <stop offset="100%" stopColor="oklch(0.55 0.18 280)" />
        </linearGradient>
      </defs>
      <path
        d="M32 4 L56 14 V32 C56 46 45 56 32 60 C19 56 8 46 8 32 V14 Z"
        fill="url(#shieldG)"
        stroke="oklch(0.85 0.1 256)"
        strokeOpacity="0.4"
        strokeWidth="1.2"
      />
      {/* eyes */}
      <circle cx="25" cy="28" r="2.4" fill="oklch(0.98 0 0)" />
      <circle cx="39" cy="28" r="2.4" fill="oklch(0.98 0 0)" />
      {/* smile */}
      <path d="M24 36 Q32 44 40 36" stroke="oklch(0.98 0 0)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* spark */}
      <circle cx="48" cy="16" r="2" fill="oklch(0.84 0.16 90)" className="anim-pulse-soft" />
    </svg>
  );
}
