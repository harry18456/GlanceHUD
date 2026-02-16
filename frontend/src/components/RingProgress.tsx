import { motion } from "framer-motion";

export function RingProgress({
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
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circ - (clamped / 100) * circ;

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }} className="drop-shadow-md">
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
          filter: `drop-shadow(0 0 4px color-mix(in srgb, ${colour} 25%, transparent))`,
        }}
      />
    </svg>
  );
}
