import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RenderConfig, DataPayload, KeyValueItem } from "../../types";
import { IconFromName } from "../../lib/iconRegistry";

// Default container size (matches defaultSize in HudGrid: 2×3 = 160×120px)
const BASE_W = 160;
const BASE_H = 120;

interface Props {
  config: RenderConfig;
  data?: DataPayload;
  containerWidth: number;
  containerHeight: number;
}

export const KVRenderer: React.FC<Props> = ({ config, data, containerWidth, containerHeight }) => {
  const items = Array.isArray(data?.items) ? (data.items as KeyValueItem[]) : [];
  const isRow = config.props?.layout === "row";

  // Scale factor
  const scaleW = containerWidth > 0 ? containerWidth / BASE_W : 1;
  const scaleH = containerHeight > 0 ? containerHeight / BASE_H : 1;
  const scale = Math.min(scaleW, scaleH);

  const titleFontSize = Math.max(9, Math.round(10 * scale));
  const keyFontSize = Math.max(9, Math.round(10 * scale));
  const valueFontSize = Math.max(11, Math.round(13 * scale));
  const iconSize = Math.max(10, Math.round(13 * scale));
  const gap = Math.max(4, Math.round(6 * scale));
  const itemGap = Math.max(3, Math.round(4 * scale));
  const rowGap = Math.max(10, Math.round(16 * scale));
  const padding = Math.max(4, Math.round(8 * scale));

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

      <div
        style={{
          display: "flex",
          flexDirection: isRow ? "row" : "column",
          gap: isRow ? rowGap : itemGap,
          flexWrap: isRow ? "wrap" : undefined,
          overflow: "hidden",
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
                gap: Math.round(8 * scale),
                flex: isRow ? "1 1 0" : undefined,
                minWidth: isRow ? 0 : undefined,
              }}
            >
              {/* Icon */}
              {item.icon && (
                <span style={{ color: "var(--color-info)", flexShrink: 0 }}>
                  <IconFromName name={item.icon} size={iconSize} />
                </span>
              )}

              {/* Key label */}
              <span
                style={{
                  fontSize: keyFontSize,
                  color: "var(--text-secondary)",
                  flexShrink: 0,
                }}
              >
                {item.key}
              </span>

              {/* Value */}
              <span
                style={{
                  fontSize: valueFontSize,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-primary)",
                  marginLeft: "auto",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexShrink: 1,
                  minWidth: 0,
                  textAlign: "right",
                }}
              >
                {item.value}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {items.length === 0 && (
        <span style={{ fontSize: keyFontSize, color: "var(--text-tertiary)" }}>No Data</span>
      )}
    </div>
  );
};
