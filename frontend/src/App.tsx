import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Cpu, MemoryStick, HardDrive, ArrowUpDown, type LucideIcon } from "lucide-react";
import { SystemService } from "../bindings/glancehud";

/* ── Colour helpers ── */
function accentForValue(v: number) {
  if (v < 50) return "var(--color-neon-green)";
  if (v < 80) return "var(--color-neon-yellow)";
  return "var(--color-neon-pink)";
}

function glowClassForValue(v: number) {
  if (v < 50) return "neon-glow-green";
  if (v < 80) return "neon-glow-yellow";
  return "neon-glow-pink";
}

/* ── AnimatedNumber ── */
function AnimatedNumber({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => v.toFixed(decimals));

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return ctrl.stop;
  }, [value, mv]);

  return <motion.span>{display}</motion.span>;
}

/* ── RingProgress ── */
function RingProgress({
  value,
  colour,
  size = 72,
  strokeWidth = 5,
}: {
  value: number;
  colour: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width={size} height={size} className="drop-shadow-md">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        className="ring-track"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          filter: `drop-shadow(0 0 4px ${colour})`,
        }}
      />
    </svg>
  );
}

/* ── StatCard ── */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub: string;
}) {
  const accent = accentForValue(value);
  const glowClass = glowClassForValue(value);

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center">
        <RingProgress value={value} colour={accent} />
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
  );
}

/* ── NetCard (compact, no ring) ── */
function NetCard({ up, down }: { up: number; down: number }) {
  const accent = "var(--color-neon-cyan)";
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
            <span className="text-lg font-mono font-bold neon-glow-green" style={{ color: "var(--color-neon-green)" }}>
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
  );
}

/* ── Main App ── */
interface SystemStats {
  cpuUsage: number;
  ramUsage: number;
  ramTotal: number;
  ramUsed: number;
  diskUsage: number;
  diskTotal: number;
  diskUsed: number;
  netUp: number;
  netDown: number;
}

function App() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data = await SystemService.GetSystemStats();
      setStats(data as SystemStats);
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1500);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-3">
      <div
        className="
          relative w-full max-w-[380px]
          rounded-2xl overflow-hidden
          bg-black/30 backdrop-blur-xl
          border-none outline-none ring-0
          scanlines
        "
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-neon-green), var(--color-neon-pink), transparent)",
          }}
        />

        {/* Drag region */}
        <div className="drag-region flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/25">
              GlanceHUD
            </span>
          </div>
          <span className="text-[9px] font-mono text-white/15 no-drag">
            v0.2.0
          </span>
        </div>

        <div className="mx-4 h-[1px] bg-white/[0.04]" />

        {/* Content */}
        <div className="px-4 py-4">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-mono text-neon-pink/80 text-center py-4"
              >
                ⚠ {error}
              </motion.div>
            ) : !stats ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-mono text-white/20 text-center py-4"
              >
                Initializing...
              </motion.div>
            ) : (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-3"
              >
                <StatCard
                  icon={Cpu}
                  label="Processor"
                  value={stats.cpuUsage}
                  sub="CPU Load"
                />
                <StatCard
                  icon={MemoryStick}
                  label="Memory"
                  value={stats.ramUsage}
                  sub={`${stats.ramUsed.toFixed(1)} / ${stats.ramTotal.toFixed(1)} GB`}
                />
                <StatCard
                  icon={HardDrive}
                  label="Disk C:"
                  value={stats.diskUsage}
                  sub={`${stats.diskUsed.toFixed(1)} / ${stats.diskTotal.toFixed(0)} GB`}
                />
                <NetCard up={stats.netUp} down={stats.netDown} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-neon-pink), var(--color-neon-green), transparent)",
          }}
        />
      </div>
    </div>
  );
}

export default App;
