import React, { useState, useEffect } from "react";
import { SystemService } from "../../bindings/glancehud/internal/service";
import { AppConfig, ConfigSchema, ModuleInfo } from "../types";
import { DynamicForm } from "./DynamicForm";
import { debugLog } from "./DebugConsole";

interface Props {
  onClose: () => void;
  modules: ModuleInfo[];
  currentConfig: AppConfig | null;
}

export const SettingsModal: React.FC<Props> = ({ onClose, modules, currentConfig }) => {
  const [config, setConfig] = useState<AppConfig | null>(currentConfig);
  const [originalOpacity, setOriginalOpacity] = useState<number>(currentConfig?.opacity || 0.72);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<Record<string, ConfigSchema[]>>({});

  useEffect(() => {
    // If we have a currentConfig, use it directly.
    debugLog("INFO", "Settings", "init with currentConfig");
    if (currentConfig) {
      setConfig(currentConfig);
      setOriginalOpacity(currentConfig.opacity || 0.72);
    } else {
      loadingFallback();
    }
    loadSchemas();
  }, [currentConfig]);

  const loadingFallback = async () => {
    try {
      const cfg = await SystemService.GetConfig();
      setConfig(cfg);
      setOriginalOpacity(cfg.opacity || 0.72);
    } catch (_) { /* silent */ }
  };

  const loadSchemas = async () => {
    try {
      const schemasMap: Record<string, ConfigSchema[]> = {};
      for (const mod of modules) {
        const schema = await SystemService.GetModuleConfigSchema(mod.moduleId);
        if (schema) {
          schemasMap[mod.moduleId] = schema;
        }
      }
      setSchemas(schemasMap);

      if (modules.length > 0 && !selectedModuleId) {
        setSelectedModuleId(modules[0].moduleId);
      }
    } catch (_) { /* silent */ }
  };

  const handleSave = async () => {
    if (!config) return;
    debugLog("INFO", "Settings", "saving config");
    try {
      await SystemService.SaveConfig(config);
      onClose();
    } catch (_) {
      // silent
    }
  };

  const handleWidgetChange = (moduleId: string, enabled: boolean) => {
    if (!config) return;
    const newWidgets = config.widgets.map((w) =>
      w.id === moduleId ? { ...w, enabled } : w
    );
    setConfig({ ...config, widgets: newWidgets });
  };

  const handlePropsChange = (moduleId: string, newProps: any) => {
    if (!config) return;
    const newWidgets = config.widgets.map((w) =>
      w.id === moduleId ? { ...w, props: newProps } : w
    );
    setConfig({ ...config, widgets: newWidgets });
  };

  const activeWidget = config?.widgets.find((w) => w.id === selectedModuleId);
  const activeSchema = selectedModuleId ? schemas[selectedModuleId] : [];
  const activeModuleTitle = modules.find(
    (m) => m.moduleId === selectedModuleId
  )?.config.title;

  if (!config) return null;

  return (
    <div className="no-drag" style={{ display: "flex", flexDirection: "column" }}>
      {/* === Global Config === */}
      <div style={{ padding: "14px 20px" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Global
        </span>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={config.minimalMode || false}
            onChange={(e) =>
              setConfig({ ...config, minimalMode: e.target.checked })
            }
            style={{
              width: 15,
              height: 15,
              accentColor: "var(--color-info)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              Minimal Mode
            </span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Compact layout for all modules
            </span>
          </div>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 10,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={config.debugConsole || false}
            onChange={(e) =>
              setConfig({ ...config, debugConsole: e.target.checked })
            }
            style={{
              width: 15,
              height: 15,
              accentColor: "var(--color-info)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              Debug Console
            </span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Show floating debug log
            </span>
          </div>
        </label>

        {/* Opacity slider */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
              Opacity
            </span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {Math.round((config.opacity || 0.72) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={Math.round((config.opacity || 0.72) * 100)}
            onChange={(e) => {
              const opacity = parseInt(e.target.value, 10) / 100;
              setConfig({ ...config, opacity });
              // Live preview
              document.documentElement.style.setProperty("--hud-opacity", String(opacity));
            }}
            style={{
              width: "100%",
              marginTop: 6,
              accentColor: "var(--color-info)",
              height: 4,
            }}
          />
        </div>

      </div>

      <div
        style={{
          height: 1,
          background: "var(--glass-divider)",
          margin: "0 20px",
        }}
      />

      {/* === Modules === */}
      <div style={{ padding: "14px 20px 0" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Modules
        </span>
      </div>

      {/* Module tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "8px 20px" }}>
        {modules.map((mod) => {
          const isActive = selectedModuleId === mod.moduleId;
          return (
            <button
              key={mod.moduleId}
              onClick={() => setSelectedModuleId(mod.moduleId)}
              style={{
                background: isActive
                  ? "rgba(255,255,255,0.08)"
                  : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "5px 10px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                color: isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {mod.config.title}
            </button>
          );
        })}
      </div>

      {/* Module settings body */}
      <div style={{ padding: "0 20px 16px" }}>
        {activeWidget && (
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={activeWidget.enabled || false}
              onChange={(e) =>
                handleWidgetChange(activeWidget.id, e.target.checked)
              }
              style={{
                width: 15,
                height: 15,
                accentColor: "var(--color-healthy)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {activeModuleTitle} — Enabled
            </span>
          </label>
        )}

        {activeWidget && activeSchema && activeSchema.length > 0 ? (
          <DynamicForm
            schema={activeSchema}
            values={activeWidget.props || {}}
            onChange={(vals) => handlePropsChange(activeWidget.id, vals)}
          />
        ) : activeWidget && activeSchema?.length === 0 ? (
          <span
            style={{
              fontSize: 11,
              color: "var(--text-tertiary)",
              fontStyle: "italic",
            }}
          >
            No additional settings for this module.
          </span>
        ) : null}

        {/* Delete button for sidecar widgets */}
        {activeWidget && modules.find((m) => m.moduleId === selectedModuleId)?.isSidecar && (
          <button
            onClick={async () => {
              if (!window.confirm(`Remove "${activeModuleTitle}"?\nThis will delete all settings for this widget.`)) return;
              try {
                await SystemService.RemoveSidecar(activeWidget.id);
                onClose();
              } catch (err) {
                debugLog("ERR", "Settings", `RemoveSidecar failed: ${err}`);
              }
            }}
            style={{
              marginTop: 16,
              padding: "6px 12px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 8,
              color: "#ef4444",
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.12)";
            }}
          >
            Remove Widget
          </button>
        )}
      </div>

      {/* Footer — Save / Cancel */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          padding: "10px 20px",
          borderTop: "1px solid var(--glass-divider)",
        }}
      >
        <button
          onClick={() => {
            // Revert live opacity preview on cancel
            document.documentElement.style.setProperty("--hud-opacity", String(originalOpacity));
            onClose();
          }}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--glass-border)",
            borderRadius: 8,
            padding: "5px 14px",
            color: "var(--text-secondary)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{
            background: "var(--color-info)",
            border: "none",
            borderRadius: 8,
            padding: "5px 14px",
            color: "#000",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};
