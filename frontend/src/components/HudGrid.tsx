import React, { useMemo, useCallback } from "react";
import { GridLayout, type Layout, type LayoutItem } from "react-grid-layout";
import { motion } from "framer-motion";
import { ModuleInfo, DataPayload, WidgetLayout } from "../types";
import { UniversalWidget } from "./UniversalWidget";
import "react-grid-layout/css/styles.css";

const CELL_WIDTH = 190; // px per grid column (before gap)
const ROW_HEIGHT = 40;  // px per grid row
const GRID_GAP: readonly [number, number] = [8, 8];
const GRID_PADDING: readonly [number, number] = [0, 0];

/** Default grid height for each widget type */
function defaultHeight(type: string): number {
  switch (type) {
    case "gauge":
      return 3;
    case "bar-list":
      return 4;
    case "key-value":
      return 3;
    case "text":
      return 2;
    default:
      return 3;
  }
}

/** Minimum grid size constraints per widget type */
function minSize(type: string): { minW: number; minH: number } {
  switch (type) {
    case "gauge":
      return { minW: 1, minH: 3 };
    case "bar-list":
      return { minW: 1, minH: 3 };
    case "key-value":
      return { minW: 1, minH: 2 };
    case "text":
      return { minW: 1, minH: 2 };
    default:
      return { minW: 1, minH: 2 };
  }
}

/** Build a type lookup map from modules: id → component type */
function buildTypeMap(modules: ModuleInfo[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const mod of modules) {
    map[mod.config.id] = mod.config.type;
  }
  return map;
}

/** Generate default layout when config has no layout data */
function generateDefaultLayout(
  modules: ModuleInfo[],
  gridColumns: number
): LayoutItem[] {
  let y = 0;
  return modules
    .filter((m) => m.enabled)
    .map((mod) => {
      const h = defaultHeight(mod.config.type);
      const { minW, minH } = minSize(mod.config.type);
      const item: LayoutItem = {
        i: mod.moduleId,
        x: 0,
        y,
        w: gridColumns,
        h,
        minW,
        minH,
      };
      y += h;
      return item;
    });
}

/** Convert WidgetLayout map to react-grid-layout Layout array */
function configToLayouts(
  modules: ModuleInfo[],
  widgetLayouts: Record<string, WidgetLayout>,
  gridColumns: number
): LayoutItem[] {
  const hasAnyLayout = Object.keys(widgetLayouts).length > 0;

  if (!hasAnyLayout) {
    return generateDefaultLayout(modules, gridColumns);
  }

  const typeMap = buildTypeMap(modules);
  let maxY = 0;
  const layouts: LayoutItem[] = [];

  for (const mod of modules.filter((m) => m.enabled)) {
    const { minW, minH } = minSize(mod.config.type);
    const saved = widgetLayouts[mod.moduleId];
    if (saved) {
      layouts.push({
        i: mod.moduleId,
        x: saved.x,
        y: saved.y,
        w: saved.w,
        h: saved.h,
        minW,
        minH,
      });
      maxY = Math.max(maxY, saved.y + saved.h);
    } else {
      const h = defaultHeight(mod.config.type);
      layouts.push({
        i: mod.moduleId,
        x: 0,
        y: maxY,
        w: gridColumns,
        h,
        minW,
        minH,
      });
      maxY += h;
    }
  }

  return layouts;
}

/** Calculate window width from grid columns */
export function calcGridWidth(gridColumns: number): number {
  return gridColumns * CELL_WIDTH + (gridColumns - 1) * GRID_GAP[0];
}

interface HudGridProps {
  modules: ModuleInfo[];
  dataMap: Record<string, DataPayload>;
  widgetLayouts: Record<string, WidgetLayout>;
  gridColumns: number;
  editMode: boolean;
  onLayoutChange: (layout: Layout) => void;
}

export const HudGrid: React.FC<HudGridProps> = ({
  modules,
  dataMap,
  widgetLayouts,
  gridColumns,
  editMode,
  onLayoutChange,
}) => {
  const enabledModules = useMemo(
    () => modules.filter((m) => m.enabled),
    [modules]
  );

  const layout = useMemo(
    () => configToLayouts(modules, widgetLayouts, gridColumns),
    [modules, widgetLayouts, gridColumns]
  );

  const width = calcGridWidth(gridColumns);

  // Compute real cell sizes for the CSS grid overlay
  const colWidthWithGap = CELL_WIDTH + GRID_GAP[0];
  const rowHeightWithGap = ROW_HEIGHT + GRID_GAP[1];

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      onLayoutChange(newLayout);
    },
    [onLayoutChange]
  );

  if (enabledModules.length === 0) {
    return null;
  }

  return (
    <div
      className={editMode ? "hud-grid-edit" : ""}
      style={editMode ? {
        "--grid-col-w": `${colWidthWithGap}px`,
        "--grid-row-h": `${rowHeightWithGap}px`,
      } as React.CSSProperties : undefined}
    >
      <GridLayout
        className="hud-grid"
        layout={layout}
        width={width}
        gridConfig={{
          cols: gridColumns,
          rowHeight: ROW_HEIGHT,
          margin: GRID_GAP,
          containerPadding: GRID_PADDING,
          maxRows: Infinity,
        }}
        dragConfig={{
          enabled: editMode,
          handle: ".widget-drag-handle",
        }}
        resizeConfig={{
          enabled: editMode,
          handles: ["se"],
        }}
        onLayoutChange={handleLayoutChange}
      >
        {enabledModules.map((mod, idx) => (
          <div key={mod.moduleId} className={editMode ? "grid-item-edit" : ""}>
            {editMode && (
              <div className="widget-drag-handle no-drag">
                <svg width="16" height="6" viewBox="0 0 16 6" fill="currentColor" opacity="0.35">
                  <circle cx="4" cy="2" r="1.2" />
                  <circle cx="8" cy="2" r="1.2" />
                  <circle cx="12" cy="2" r="1.2" />
                </svg>
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              style={{ height: "100%", paddingTop: editMode ? 20 : 0 }}
            >
              <UniversalWidget
                config={mod.config}
                data={dataMap[mod.config.id]}
              />
            </motion.div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
};
