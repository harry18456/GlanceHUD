import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RenderConfig, DataPayload, KeyValueItem } from "../../types";
import { IconFromName } from "../../lib/iconRegistry";

interface Props {
  config: RenderConfig;
  data?: DataPayload;
}

export const KVRenderer: React.FC<Props> = ({ config, data }) => {
  const items = Array.isArray(data?.items) ? (data.items as KeyValueItem[]) : [];
  const isRow = config.props?.layout === "row";

  return (
    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
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

      <div
        style={{
          display: "flex",
          flexDirection: isRow ? "row" : "column",
          gap: isRow ? 20 : 8,
          flexWrap: isRow ? "wrap" : undefined,
        }}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: isRow ? "1 1 0" : undefined,
                minWidth: isRow ? 0 : undefined,
              }}
            >
              {/* Icon */}
              {item.icon && (
                <span style={{ color: "var(--color-info)", flexShrink: 0 }}>
                  <IconFromName name={item.icon} size={14} />
                </span>
              )}

              {/* Key label */}
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                {item.key}
              </span>

              {/* Value */}
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  marginLeft: "auto",
                }}
              >
                {item.value}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>No Data</span>
      )}
    </div>
  );
};
