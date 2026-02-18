import React from "react";
import { RenderConfig, DataPayload } from "../../types";
import { AnimatedNumber } from "../AnimatedNumber";
import { statusColorHex } from "../../lib/statusColor";

// Default container size (matches defaultSize in HudGrid: 3×2 = 240×80px)
const BASE_W = 240;
const BASE_H = 80;

interface Props {
  config: RenderConfig;
  data?: DataPayload;
  history: number[];
  containerWidth: number;
  containerHeight: number;
}

export const SparklineRenderer: React.FC<Props> = ({
  config,
  data,
  history,
  containerWidth,
  containerHeight,
}) => {
  const value = typeof data?.value === "number" ? data.value : null;
  const unit = (config.props?.unit as string) || "";
  const color =
    (config.props?.color as string) ||
    (value !== null ? statusColorHex(value) : "#22c55e");

  const scaleW = containerWidth > 0 ? containerWidth / BASE_W : 1;
  const scaleH = containerHeight > 0 ? containerHeight / BASE_H : 1;
  const scale = Math.min(scaleW, scaleH);

  const titleFontSize = Math.max(9, Math.round(10 * scale));
  const valueFontSize = Math.max(14, Math.round(18 * scale));
  const headerHeight = Math.max(18, Math.round(22 * scale));
  const padding = Math.max(6, Math.round(10 * scale));
  const strokeWidth = Math.max(1, Math.round(1.5 * scale * 10) / 10);
  const dotRadius = Math.max(2, Math.round(2.5 * scale * 10) / 10);

  // SVG coordinate space — sized to container minus header and padding
  const svgW = Math.max(1, containerWidth - padding * 2);
  const svgH = Math.max(1, containerHeight - headerHeight - padding * 1.5);

  // Y-axis: auto-scale with 10% vertical padding so the line never touches edges
  const minVal = history.length > 1 ? Math.min(...history) : 0;
  const maxVal = history.length > 1 ? Math.max(...history) : 100;
  const range = maxVal - minVal || 1;
  const yInset = svgH * 0.1;

  const toSvgPoint = (v: number, i: number) => ({
    x: history.length > 1
      ? (i / (history.length - 1)) * svgW
      : svgW / 2,
    y: svgH - yInset - ((v - minVal) / range) * (svgH - yInset * 2),
  });

  const points = history.map(toSvgPoint);
  const linePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPoints =
    points.length > 0
      ? [
          ...points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),
          `${points[points.length - 1].x.toFixed(1)},${svgH}`,
          `0,${svgH}`,
        ].join(" ")
      : "";

  // Sanitize config.id for use as SVG gradient id (dots → dashes)
  const gradId = `spark-grad-${config.id.replace(/\./g, "-")}`;

  return (
    <div
      style={{
        padding: `${padding}px ${padding}px ${Math.round(padding * 0.5)}px`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Header row: title + current value */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexShrink: 0,
          height: headerHeight,
        }}
      >
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
            color: "var(--text-primary)",
          }}
        >
          {value !== null ? (
            <AnimatedNumber value={value} decimals={1} suffix={unit} />
          ) : (
            "--"
          )}
        </span>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {history.length > 1 ? (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Gradient fill under line */}
            <polygon points={fillPoints} fill={`url(#${gradId})`} />

            {/* Trend line */}
            <polyline
              points={linePoints}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Latest value dot */}
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={dotRadius}
              fill={color}
            />
          </svg>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: titleFontSize, color: "var(--text-tertiary)" }}>
              Collecting data…
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
