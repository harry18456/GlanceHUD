const THRESHOLDS = { CRITICAL: 85, WARNING: 60 } as const;

/**
 * Returns a CSS variable reference for the given percentage value.
 * green (< 60%) → amber (60-85%) → red (> 85%)
 */
export function statusColor(value: number): string {
  if (value >= THRESHOLDS.CRITICAL) return "var(--color-critical)";
  if (value >= THRESHOLDS.WARNING) return "var(--color-warning)";
  return "var(--color-healthy)";
}

/**
 * Returns a hex color string for the given percentage value.
 * Useful for SVG stroke/fill where CSS variables may not resolve.
 */
export function statusColorHex(value: number): string {
  if (value >= THRESHOLDS.CRITICAL) return "#ef4444";
  if (value >= THRESHOLDS.WARNING) return "#f59e0b";
  return "#22c55e";
}
