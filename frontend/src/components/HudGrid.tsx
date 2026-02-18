import React, { useMemo, useCallback } from "react";
import { GridLayout, getCompactor, type Layout, type LayoutItem } from "react-grid-layout";
import { motion } from "framer-motion";
import { ModuleInfo, DataPayload, WidgetLayout } from "../types";
import { UniversalWidget } from "./UniversalWidget";
import "react-grid-layout/css/styles.css";

// Free positioning (no auto-compaction) + collision prevention (no overlap)
const freeCompactor = getCompactor(null, false, true);

// Fine-grained grid units for smoother drag/resize experience
const CELL_WIDTH = 80;   // px per grid column
const ROW_HEIGHT = 40;   // px per grid row
const GRID_GAP: readonly [number, number] = [8, 8];
const GRID_PADDING: readonly [number, number] = [0, 0];

/**
 * Default and minimum grid size per widget type.
 * The default size is also the minimum resize constraint.
 */
function defaultSize(type: string): { w: number; h: number } {
  switch (type) {
    case "gauge":
      return { w: 2, h: 3 };   // ~160×120px
    case "bar-list":
      return { w: 3, h: 3 };   // ~240×120px
    case "key-value":
      return { w: 2, h: 3 };   // ~160×120px
    case "text":
      return { w: 2, h: 2 };   // ~160×80px
    case "sparkline":
      return { w: 3, h: 2 };   // ~240×80px (wide format suits trend data)
    default:
      return { w: 2, h: 3 };
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
  return modules
    .filter((m) => m.enabled)
    .map((mod, idx) => {
      const { w, h } = defaultSize(mod.config.type);
      return {
        i: mod.moduleId,
        x: (idx % gridColumns) * w,
        y: Math.floor(idx / gridColumns) * h,
        w,
        h,
        minW: w,
        minH: h,
      };
    });
}

/** Check if a candidate rect overlaps with any existing layout item */
function hasCollision(
  layouts: LayoutItem[],
  x: number, y: number, w: number, h: number,
  ignoreId?: string
): boolean {
  return layouts.some((l) => {
    if (l.i === ignoreId) return false;
    return x < l.x + l.w && x + w > l.x && y < l.y + l.h && y + h > l.y;
  });
}

/** Find a free position by scanning rows downward */
function findFreePosition(
  layouts: LayoutItem[],
  w: number, h: number,
  gridColumns: number
): { x: number; y: number } {
  for (let row = 0; ; row++) {
    for (let col = 0; col <= gridColumns - w; col++) {
      if (!hasCollision(layouts, col, row, w, h)) {
        return { x: col, y: row };
      }
    }
  }
}

/** Convert WidgetLayout map to react-grid-layout Layout array */
function configToLayouts(
  modules: ModuleInfo[],
  widgetLayouts: Record<string, WidgetLayout>,
  gridColumns: number,
  offset: { x: number; y: number }
): LayoutItem[] {
  const hasAnyLayout = Object.keys(widgetLayouts).length > 0;

  if (!hasAnyLayout) {
    // Default layout starts at (0,0), so no offset needed usually, 
    // but strictly speaking we should probably respect something. 
    // For now assume default generation is always fresh and 0-based.
    return generateDefaultLayout(modules, gridColumns);
  }

  const layouts: LayoutItem[] = [];
  let idx = 0;

  for (const mod of modules.filter((m) => m.enabled)) {
    const { w: defW, h: defH } = defaultSize(mod.config.type);
    const saved = widgetLayouts[mod.moduleId];

    let x: number, y: number, w: number, h: number;

    if (saved) {
      w = Math.max(saved.w, defW);
      h = Math.max(saved.h, defH);
      // Convert Model -> Render (Shift by offset)
      x = saved.x - offset.x;
      y = saved.y - offset.y;

      // If saved position collides with already-placed widgets, find a free spot
      // Note: x, y here are already in Render Space
      if (hasCollision(layouts, x, y, w, h)) {
        const free = findFreePosition(layouts, w, h, gridColumns);
        x = free.x;
        y = free.y;
      }
    } else {
      w = defW;
      h = defH;
      const free = findFreePosition(layouts, w, h, gridColumns);
      x = free.x;
      y = free.y;
    }

    layouts.push({ i: mod.moduleId, x, y, w, h, minW: defW, minH: defH });
    idx++;
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
  contentWidth: number; // Actual visible width (derived from content extent)
  editMode: boolean;
  layoutOffset?: { x: number; y: number }; // Virtual Origin Offset
  onLayoutChange: (layout: Layout) => void;
  onDrag?: (layout: Layout, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => void;
  onResize?: (layout: Layout, oldItem: any, newItem: any, placeholder: any, e: any, element: any) => void;
}

export const HudGrid: React.FC<HudGridProps> = ({
  modules,
  dataMap,
  widgetLayouts,
  gridColumns,
  contentWidth,
  editMode,
  layoutOffset = { x: 0, y: 0 },
  onLayoutChange,
  onDrag,
  onResize,
}) => {
  const enabledModules = useMemo(
    () => modules.filter((m) => m.enabled),
    [modules]
  );

  const layout = useMemo(
    () => configToLayouts(modules, widgetLayouts, gridColumns, layoutOffset),
    [modules, widgetLayouts, gridColumns, layoutOffset]
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

  // Force emit layout to parent so it knows the extent (especially for auto-placed widgets)
  React.useEffect(() => {
    onLayoutChange(layout);
  }, [layout, onLayoutChange]);

  return (
    <div
      className={editMode ? "hud-grid-edit" : ""}
      style={{
        width: contentWidth,
        ...(editMode ? {
          "--grid-col-w": `${colWidthWithGap}px`,
          "--grid-row-h": `${rowHeightWithGap}px`,
        } as React.CSSProperties : {}),
      }}
    >
      <GridLayout
        className="hud-grid"
        layout={layout}
        width={width}
        compactor={freeCompactor}
        gridConfig={{
          cols: gridColumns,
          rowHeight: ROW_HEIGHT,
          margin: GRID_GAP,
          containerPadding: GRID_PADDING,
          maxRows: Infinity,
        }}
        dragConfig={{
          enabled: editMode,
        }}
        resizeConfig={{
          enabled: editMode,
          handles: ["se", "e", "s", "sw", "ne", "nw", "n", "w"],
        }}
        onLayoutChange={handleLayoutChange}
        onDrag={onDrag}
        onResize={onResize}
      >
        {enabledModules.map((mod, idx) => (
          <div
            key={mod.moduleId}
            className={`hud-widget-cell ${editMode ? "hud-cell-edit" : "hud-cell-view"}`}
          >
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.06 }}
              style={{ height: "100%" }}
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
