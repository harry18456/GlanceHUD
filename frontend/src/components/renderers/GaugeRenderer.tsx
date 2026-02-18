import React from "react";
import { RenderConfig, DataPayload } from "../../types";
import { RingProgress } from "../RingProgress";
import { AnimatedNumber } from "../AnimatedNumber";
import { statusColorHex } from "../../lib/statusColor";

// Default container size (matches defaultSize in HudGrid: 2×3 = 160×120px)
const BASE_W = 160;
const BASE_H = 120;

interface Props {
  config: RenderConfig;
  data?: DataPayload;
  containerWidth: number;
  containerHeight: number;
}

export const GaugeRenderer: React.FC<Props> = ({ config, data, containerWidth, containerHeight }) => {
  const value = typeof data?.value === "number" ? data.value : 0;
  const unit = (config.props?.unit as string) || "%";
  const color = (config.props?.color as string) || statusColorHex(value);

  // Scale factor based on container size relative to base
  const scaleW = containerWidth > 0 ? containerWidth / BASE_W : 1;
  const scaleH = containerHeight > 0 ? containerHeight / BASE_H : 1;
  const scale = Math.min(scaleW, scaleH); // uniform scale, constrained by smaller axis

  const ringSize = Math.max(28, Math.round(46 * scale));
  const strokeWidth = Math.max(3, Math.round(4.5 * scale));
  const titleFontSize = Math.max(9, Math.round(10 * scale));
  const valueFontSize = Math.max(14, Math.round(22 * scale));
  const labelFontSize = Math.max(9, Math.round(10 * scale));
  const gap = Math.max(6, Math.round(10 * scale));
  const padding = Math.max(4, Math.round(8 * scale));

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap,
      padding: `${padding}px ${Math.round(padding * 1.3)}px`,
      height: "100%",
      boxSizing: "border-box",
    }}>
      {/* Left: Ring */}
      <RingProgress value={value} colour={color} size={ringSize} strokeWidth={strokeWidth} />

      {/* Right: Text */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 500,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {config.title}
        </span>
        <span
          style={{
            fontSize: valueFontSize,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            lineHeight: 1.1,
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <AnimatedNumber value={value} decimals={1} suffix={unit} />
        </span>
      </div>
    </div>
  );
};
