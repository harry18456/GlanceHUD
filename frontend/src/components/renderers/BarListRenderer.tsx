import React from "react";
import { motion } from "framer-motion";
import { RenderConfig, DataPayload } from "../../types";
import { statusColor } from "../../lib/statusColor";

interface Props {
  config: RenderConfig;
  data?: DataPayload;
}

export const BarListRenderer: React.FC<Props> = ({ config, data }) => {
  const items = Array.isArray(data?.items)
    ? (data.items as Array<{ label: string; percent: number; value: string }>)
    : [];

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      {config.title && (
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
      )}

      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                fontSize: 11,
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
              height: 4,
              borderRadius: 2,
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
                borderRadius: 2,
                background: statusColor(item.percent),
              }}
            />
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No Data</span>
      )}
    </div>
  );
};
