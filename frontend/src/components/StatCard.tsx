import { LucideIcon } from "lucide-react"
import { AnimatedNumber } from "./AnimatedNumber"
import { RingProgress } from "./RingProgress"

/* ── Colour helpers ── */
export function accentForValue(v: number) {
  if (v < 50) return "var(--color-neon-green)"
  if (v < 80) return "var(--color-neon-yellow)"
  return "var(--color-neon-pink)"
}

export function glowClassForValue(v: number) {
  if (v < 50) return "neon-glow-green"
  if (v < 80) return "neon-glow-yellow"
  return "neon-glow-pink"
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  percentValue, // Optional, if different from value (e.g. disk used vs total)
}: {
  icon: LucideIcon
  label: string
  value: number
  sub: string
  percentValue?: number
}) {
  const effectivePercent = percentValue !== undefined ? percentValue : value
  const accent = accentForValue(effectivePercent)
  const glowClass = glowClassForValue(effectivePercent)

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        <RingProgress value={effectivePercent} colour={accent} />
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: accent }}
        >
          <Icon size={22} />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
          {label}
        </span>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-mono font-bold ${glowClass}`} style={{ color: accent }}>
            <AnimatedNumber value={value} />
          </span>
          <span className="text-sm font-mono text-white/30">%</span>
        </div>
        <span className="text-[10px] font-mono text-white/25">{sub}</span>
      </div>
    </div>
  )
}
