import React, { useState, useEffect } from "react";
import { SystemService } from "../../bindings/glancehud";
import { AppConfig, ConfigSchema, ModuleInfo } from "../types";
import { DynamicForm } from "./DynamicForm";

interface Props {
  onClose: () => void;
  modules: ModuleInfo[];
}

export const SettingsModal: React.FC<Props> = ({ onClose, modules }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<Record<string, ConfigSchema[]>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await SystemService.GetConfig();
      setConfig(cfg);

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
    } catch (_) {
      // silent
    }
  };

  const handleSave = async () => {
    if (!config) return;
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
              極簡模式
            </span>
            <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
              Compact layout for all modules
            </span>
          </div>
        </label>
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
      <div style={{ display: "flex", gap: 2, padding: "8px 20px" }}>
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
          onClick={onClose}
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
