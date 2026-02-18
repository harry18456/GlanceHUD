import React from "react"
import { motion } from "framer-motion"
import { RenderConfig, DataPayload } from "../../types"
import { statusColor } from "../../lib/statusColor"

// Default container size (matches defaultSize in HudGrid: 3×3 = 240×120px)
const BASE_W = 240
const BASE_H = 120

interface Props {
  config: RenderConfig
  data?: DataPayload
  containerWidth: number
  containerHeight: number
}

export const BarListRenderer: React.FC<Props> = ({
  config,
  data,
  containerWidth,
  containerHeight,
}) => {
  const items = Array.isArray(data?.items)
    ? (data.items as Array<{ label: string; percent: number; value: string }>)
    : []
  const fixedColor = config.props?.color as string | undefined

  // Scale factor
  const scaleW = containerWidth > 0 ? containerWidth / BASE_W : 1
  const scaleH = containerHeight > 0 ? containerHeight / BASE_H : 1
  const scale = Math.min(scaleW, scaleH)

  const titleFontSize = Math.max(9, Math.round(11 * scale))
  const labelFontSize = Math.max(10, Math.round(12 * scale))
  const valueFontSize = Math.max(9, Math.round(11 * scale))
  const barHeight = Math.max(3, Math.round(4 * scale))
  const gap = Math.max(6, Math.round(10 * scale))
  const itemGap = Math.max(3, Math.round(4 * scale))
  const padding = Math.max(6, Math.round(12 * scale))

  return (
    <div
      style={{
        padding: `${padding}px ${Math.round(padding * 1.3)}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap,
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {config.title && (
        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 500,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            flexShrink: 0,
          }}
        >
          {config.title}
        </span>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap, overflow: "hidden" }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: itemGap }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
            >
              <span
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: valueFontSize,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {item.value}
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: barHeight,
                borderRadius: barHeight / 2,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.percent}%` }}
                transition={{ type: "spring", stiffness: 80, damping: 18 }}
                style={{
                  height: "100%",
                  borderRadius: barHeight / 2,
                  background: fixedColor ?? statusColor(item.percent),
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <span style={{ fontSize: labelFontSize, color: "var(--text-tertiary)" }}>No Data</span>
      )}
    </div>
  )
}
