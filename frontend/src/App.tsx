import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SystemService } from "../bindings/glancehud";
import { ModuleInfo, DataPayload, UpdateEvent } from "./types";
import { Events } from "@wailsio/runtime";
import { UniversalWidget } from "./components/UniversalWidget";
import { SettingsModal } from "./components/SettingsModal";
import { useAutoResize } from "./lib/useAutoResize";
import "./style.css";
import packageJson from "../package.json";

const fadeSlide = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

function App() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, DataPayload>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const glassRef = useAutoResize();

  useEffect(() => {
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

    // Sidecar Event: Allows external apps to push updates via "widget:update"
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

    return () => {
      unsubStats();
      unsubWidget();
    };
  }, []);

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
    loadModules();
  };

  return (
    <div
      ref={glassRef}
      className="drag-region"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 12,
        color: "white",
        background: "transparent",
      }}
    >
      <div
        className="hud-glass"
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header bar */}
        <div
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
            {isSettingsOpen ? "Settings" : (
              <>
                GLANCEHUD <span style={{ opacity: 0.5, fontSize: "0.9em", marginLeft: 4 }}>v{packageJson.version}</span>
              </>
            )}
          </span>
          <button
            className="no-drag"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
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

        {/* Content */}
        {isSettingsOpen ? (
          <SettingsModal
            onClose={handleSettingsClose}
            modules={modules}
          />
        ) : (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              {modules
                .filter((m) => m.enabled)
                .map((mod, idx) => (
                  <motion.div
                    key={mod.config.id}
                    initial={fadeSlide.initial}
                    animate={fadeSlide.animate}
                    transition={{ duration: 0.3, delay: idx * 0.06 }}
                  >
                    {idx > 0 && <div className="hud-divider" />}
                    <UniversalWidget config={mod.config} data={dataMap[mod.config.id]} />
                  </motion.div>
                ))}
            </div>

            {modules.length === 0 && (
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
            )}

            {modules.length > 0 && modules.filter((m) => m.enabled).length === 0 && (
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
  );
}

export default App;
