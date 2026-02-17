import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SystemService } from "../bindings/glancehud";
import { ModuleInfo, DataPayload, UpdateEvent, AppConfig, WidgetLayout } from "./types";
import { Events } from "@wailsio/runtime";
import { HudGrid, calcGridWidth } from "./components/HudGrid";
import { SettingsModal } from "./components/SettingsModal";
import { useAutoResize } from "./lib/useAutoResize";
import "./style.css";
import packageJson from "../package.json";
import type { Layout } from "react-grid-layout";

/** Apply HUD opacity to CSS custom property */
function applyOpacity(opacity: number) {
  document.documentElement.style.setProperty(
    "--hud-opacity",
    String(Math.max(0.1, Math.min(1, opacity)))
  );
}


function App() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, DataPayload>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [pendingLayouts, setPendingLayouts] = useState<Layout | null>(null);

  const gridColumns = appConfig?.gridColumns || 2;
  const gridWidth = useMemo(() => calcGridWidth(gridColumns), [gridColumns]);
  // Settings panel needs at least 400px; use grid width otherwise
  const MIN_SETTINGS_WIDTH = 376; // 400 - 24 outer padding
  const effectiveWidth = isSettingsOpen ? Math.max(gridWidth, MIN_SETTINGS_WIDTH) : gridWidth;
  const glassRef = useAutoResize(effectiveWidth);

  // Build widget layouts map from config
  const widgetLayouts = useMemo<Record<string, WidgetLayout>>(() => {
    if (!appConfig) return {};
    const map: Record<string, WidgetLayout> = {};
    for (const w of appConfig.widgets) {
      if (w.layout) {
        map[w.id] = w.layout;
      }
    }
    return map;
  }, [appConfig]);

  // Load config and apply opacity
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await SystemService.GetConfig();
      setAppConfig(cfg);
      applyOpacity(cfg.opacity || 0.72);
      setIsLocked(cfg.windowMode === "locked");
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadModules();

    const unsubStats = Events.On("stats:update", (event: any) => {
      const payload = (
        Array.isArray(event.data) ? event.data[0] : event.data
      ) as UpdateEvent;
      if (payload && payload.id) {
        setDataMap((prev) => ({
          ...prev,
          [payload.id]: payload.data,
        }));
      }
    });

    // Sidecar Event
    const unsubWidget = Events.On("widget:update", (event: any) => {
      const payload = (
        Array.isArray(event.data) ? event.data[0] : event.data
      ) as UpdateEvent;
      if (payload && payload.id) {
        setDataMap((prev) => ({
          ...prev,
          [payload.id]: payload.data,
        }));
      }
    });

    // Config update from Tray (e.g. opacity change)
    const unsubConfig = Events.On("config:update", (event: any) => {
      const data = Array.isArray(event.data) ? event.data[0] : event.data;
      if (data?.opacity != null) {
        applyOpacity(data.opacity);
        setAppConfig((prev) => prev ? { ...prev, opacity: data.opacity } : prev);
      }
    });

    // Mode change from Tray (lock/edit)
    const unsubMode = Events.On("mode:change", (event: any) => {
      const data = Array.isArray(event.data) ? event.data[0] : event.data;
      if (data?.windowMode != null) {
        setIsLocked(data.windowMode === "locked");
        if (data.windowMode === "locked") {
          setIsEditMode(false);
          setIsSettingsOpen(false);
        }
      }
      if (data?.editMode != null) {
        setIsEditMode(data.editMode);
        if (data.editMode) {
          setIsLocked(false);
          setIsSettingsOpen(false);
        }
      }
    });

    // Open settings from Tray
    const unsubOpenSettings = Events.On("open:settings", () => {
      setIsSettingsOpen(true);
    });

    return () => {
      unsubStats();
      unsubWidget();
      unsubConfig();
      unsubMode();
      unsubOpenSettings();
    };
  }, [loadConfig]);

  const loadModules = () => {
    SystemService.GetModules()
      .then((infos: any) => {
        const parsed: ModuleInfo[] = (infos || []).map((i: any) => ({
          moduleId: i.moduleId,
          config: i.config,
          enabled: i.enabled ?? true,
        }));
        setModules(parsed);
        return SystemService.GetCurrentData();
      })
      .then((data: any) => {
        if (data) {
          if (data instanceof Map) {
            setDataMap(Object.fromEntries(data.entries()) as Record<string, DataPayload>);
          } else {
            setDataMap(data);
          }
        }
      });
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    setDataMap({}); // Clear stale data

    // Reload config from backend, but preserve existing widget layouts
    // so the grid doesn't reset positions when toggling modules or changing settings.
    SystemService.GetConfig()
      .then((cfg: AppConfig) => {
        setAppConfig((prev) => {
          if (!prev) return cfg;
          // Merge: use new config but keep existing layout for each widget
          const prevLayoutMap: Record<string, any> = {};
          for (const w of prev.widgets) {
            if (w.layout) prevLayoutMap[w.id] = w.layout;
          }
          const mergedWidgets = cfg.widgets.map((w) => ({
            ...w,
            layout: prevLayoutMap[w.id] ?? w.layout,
          }));
          return { ...cfg, widgets: mergedWidgets };
        });
        applyOpacity(cfg.opacity || 0.72);
        setIsLocked(cfg.windowMode === "locked");
      })
      .catch(() => { /* silent */ });

    loadModules();
  };

  // Track layout changes while in edit mode
  const handleLayoutChange = useCallback((layout: Layout) => {
    if (isEditMode) {
      setPendingLayouts(layout);
    }
  }, [isEditMode]);

  // Refs to avoid stale closures in the layout save effect
  const appConfigRef = useRef(appConfig);
  appConfigRef.current = appConfig;
  const pendingLayoutsRef = useRef(pendingLayouts);
  pendingLayoutsRef.current = pendingLayouts;

  // Save layout when exiting edit mode
  useEffect(() => {
    const layouts = pendingLayoutsRef.current;
    const config = appConfigRef.current;
    if (!isEditMode && layouts && config) {
      const newWidgets = config.widgets.map((w) => {
        const layoutItem = layouts.find((l) => l.i === w.id);
        if (layoutItem) {
          return {
            ...w,
            layout: { x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h },
          };
        }
        return w;
      });
      const newConfig = { ...config, widgets: newWidgets };
      setAppConfig(newConfig);
      SystemService.SaveConfig(newConfig).catch((err: unknown) => {
        console.error("Failed to save layout config:", err);
      });
      setPendingLayouts(null);
    }
  }, [isEditMode]);

  // Toggle edit mode from header button
  const handleToggleEdit = () => {
    setIsEditMode((prev) => !prev);
  };

  return (
    <>
    <div
      ref={glassRef}
      className={(isEditMode || isSettingsOpen) ? "no-drag" : "drag-region"}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 12,
        color: "white",
        // Minimal alpha so Win32 WS_EX_LAYERED hit-testing registers these pixels.
        // Fully transparent (alpha=0) areas become click-through on Windows.
        background: "rgba(0, 0, 0, 0.01)",
      }}
    >
      <div
        className={`hud-glass${isLocked ? " hud-locked" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header bar — always draggable even in edit mode */}
        <div
          className="drag-region"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderBottom: "1px solid var(--glass-divider)",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {isSettingsOpen ? "Settings" : isEditMode ? (
              <>
                <span style={{ color: "var(--color-warning)" }}>Edit Mode</span>
              </>
            ) : (
              <>
                GLANCEHUD <span style={{ opacity: 0.5, fontSize: "0.9em", marginLeft: 4 }}>v{packageJson.version}</span>
              </>
            )}
          </span>

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {/* Edit mode toggle button (only shown when not in settings) */}
            {!isSettingsOpen && (
              <button
                className="no-drag"
                onClick={handleToggleEdit}
                title={isEditMode ? "Save layout" : "Edit layout"}
                style={{
                  background: isEditMode ? "rgba(245, 158, 11, 0.15)" : "none",
                  border: isEditMode ? "1px solid rgba(245, 158, 11, 0.3)" : "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: 4,
                  color: isEditMode ? "var(--color-warning)" : "var(--text-tertiary)",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isEditMode) e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  if (!isEditMode) e.currentTarget.style.color = "var(--text-tertiary)";
                }}
              >
                {isEditMode ? (
                  // Check icon (save)
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  // Grid/layout icon
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                  </svg>
                )}
              </button>
            )}

            {/* Settings button */}
            <button
              className="no-drag"
              onClick={() => {
                if (isEditMode) {
                  setIsEditMode(false);
                }
                setIsSettingsOpen((prev) => !prev);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              {isSettingsOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        {isSettingsOpen ? (
          <SettingsModal
            onClose={handleSettingsClose}
            modules={modules}
          />
        ) : (
          <>
            {modules.filter((m) => m.enabled).length > 0 ? (
              <HudGrid
                modules={modules}
                dataMap={dataMap}
                widgetLayouts={widgetLayouts}
                gridColumns={gridColumns}
                editMode={isEditMode}
                onLayoutChange={handleLayoutChange}
              />
            ) : modules.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  padding: 40,
                  fontSize: 13,
                }}
              >
                Loading modules...
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                  padding: 32,
                  fontSize: 12,
                }}
              >
                All modules disabled. Open Settings to enable.
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}



export default App;
