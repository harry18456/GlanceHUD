import { ArrowUpDown } from "lucide-react"
import { AnimatedNumber } from "./AnimatedNumber"

export function NetCard({ up, down }: { up: number; down: number }) {
  const accent = "var(--color-neon-cyan)"
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center w-[72px] h-[72px]">
        <div style={{ color: accent }}>
          <ArrowUpDown size={26} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
          Network
        </span>
        <div className="flex gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-mono text-white/30">▲</span>
            <span
              className="text-lg font-mono font-bold neon-glow-green"
              style={{ color: "var(--color-neon-green)" }}
            >
              <AnimatedNumber value={up} />
            </span>
            <span className="text-[10px] font-mono text-white/25">KB/s</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-mono text-white/30">▼</span>
            <span className="text-lg font-mono font-bold" style={{ color: accent }}>
              <AnimatedNumber value={down} />
            </span>
            <span className="text-[10px] font-mono text-white/25">KB/s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
