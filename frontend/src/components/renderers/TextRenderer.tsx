import React from "react";
import { RenderConfig, DataPayload } from "../../types";
import { AnimatedNumber } from "../AnimatedNumber";

// Default container size (matches defaultSize in HudGrid: 2×2 = 160×80px)
const BASE_W = 160;
const BASE_H = 80;

interface Props {
  config: RenderConfig;
  data?: DataPayload;
  containerWidth: number;
  containerHeight: number;
}

export const TextRenderer: React.FC<Props> = ({ config, data, containerWidth, containerHeight }) => {
  const rawValue = data?.value;
  const label = data?.label || config.title;
  const items = data?.items as Array<{ key: string; value: string }>;

  // Scale factor
  const scaleW = containerWidth > 0 ? containerWidth / BASE_W : 1;
  const scaleH = containerHeight > 0 ? containerHeight / BASE_H : 1;
  const scale = Math.min(scaleW, scaleH);

  const titleFontSize = Math.max(9, Math.round(11 * scale));
  const valueFontSize = Math.max(14, Math.round(20 * scale));
  const subKeyFontSize = Math.max(8, Math.round(10 * scale));
  const subValueFontSize = Math.max(10, Math.round(13 * scale));
  const gap = Math.max(4, Math.round(6 * scale));
  const padding = Math.max(6, Math.round(12 * scale));

  return (
    <div style={{
      padding: `${padding}px ${Math.round(padding * 1.3)}px`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap,
      height: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            fontSize: titleFontSize,
            fontWeight: 500,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: valueFontSize,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            color: "var(--text-primary)",
          }}
        >
          {typeof rawValue === "number" ? (
            <AnimatedNumber value={rawValue} decimals={1} />
          ) : (
            rawValue ?? "-"
          )}
        </span>
      </div>

      {items && Array.isArray(items) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap,
            marginTop: 2,
            flex: 1,
            overflow: "hidden",
          }}
        >
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: subKeyFontSize, color: "var(--text-tertiary)" }}>{item.key}</span>
              <span
                style={{
                  fontSize: subValueFontSize,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
