import React from "react";
import { RenderConfig, DataPayload } from "../../types";
import { RingProgress } from "../RingProgress";
import { AnimatedNumber } from "../AnimatedNumber";
import { statusColorHex } from "../../lib/statusColor";

interface Props {
  config: RenderConfig;
  data?: DataPayload;
}

export const GaugeRenderer: React.FC<Props> = ({ config, data }) => {
  const value = typeof data?.value === "number" ? data.value : 0;
  const unit = (config.props?.unit as string) || "%";
  const color = statusColorHex(value);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
      {/* Left: Ring */}
      <RingProgress value={value} colour={color} size={56} strokeWidth={5} />

      {/* Right: Text */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontSize: 11,
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
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            lineHeight: 1.1,
            color: "var(--text-primary)",
          }}
        >
          <AnimatedNumber value={value} decimals={1} suffix={unit} />
        </span>
        {data?.label && (
          <span style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            {data.label}
          </span>
        )}
      </div>
    </div>
  );
};
