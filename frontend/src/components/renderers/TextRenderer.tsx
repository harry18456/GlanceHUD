import React from "react";
import { RenderConfig, DataPayload } from "../../types";
import { AnimatedNumber } from "../AnimatedNumber";

interface Props {
  config: RenderConfig;
  data?: DataPayload;
}

export const TextRenderer: React.FC<Props> = ({ config, data }) => {
  const rawValue = data?.value;
  const label = data?.label || config.title;
  const items = data?.items as Array<{ key: string; value: string }>;

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span
          style={{
            fontSize: 11,
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
            fontSize: 20,
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
            gap: 6,
            marginTop: 2,
          }}
        >
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{item.key}</span>
              <span
                style={{
                  fontSize: 13,
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
