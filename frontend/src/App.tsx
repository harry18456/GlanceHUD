import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { SystemService } from "../bindings/glancehud";
import { Events } from "@wailsio/runtime";
import { AppConfig, ModuleData } from "../bindings/glancehud/internal/modules/models";
import { WIDGET_REGISTRY } from "./WidgetRegistry";
import { SettingsModal } from "./components/SettingsModal";

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState<ModuleData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load config on startup
  useEffect(() => {
    async function loadConfig() {
      try {
        const cfg = await SystemService.GetConfig();
        setConfig(cfg);
      } catch (err) {
        console.error("Failed to load config:", err);
        setError("Failed to load config");
      }
    }
    loadConfig();
  }, []);

  // Save config
  const handleSaveConfig = async (newConfig: AppConfig) => {
    try {
      await SystemService.SaveConfig(newConfig);
      setConfig(newConfig);
    } catch (err) {
      console.error("Failed to save config:", err);
      // specific error handling
    }
  };

  useEffect(() => {
    // Initial fetch to populate data quickly
    SystemService.GetSystemStats().then(setStats).catch(console.error);

    // Listen for events
    const unsub = Events.On("stats:update", (event: any) => {
      const data = event.data as ModuleData;
      setStats((prev) => {
        const index = prev.findIndex((s) => s.id === data.id);
        if (index === -1) return [...prev, data];
        const newStats = [...prev];
        newStats[index] = data;
        return newStats;
      });
    });

    return () => unsub();
  }, []);

  if (!config) {
    return (
      <div className="w-screen h-screen flex items-center justify-center text-white/20 font-mono text-xs">
        Loading config...
      </div>
    );
  }

  // Create a map for O(1) stats lookup
  const statsMap = new Map(stats.map((s) => [s.id, s]));

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-3">
      <div
        className="
          relative w-full max-w-[380px]
          rounded-2xl overflow-hidden
          bg-black/30 backdrop-blur-xl
          border-none outline-none ring-0
          scanlines
        "
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-neon-green), var(--color-neon-pink), transparent)",
          }}
        />

        {/* Drag region */}
        <div className="drag-region flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-glow" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/25">
              GlanceHUD
            </span>
          </div>
          <div className="flex items-center gap-3 no-drag">
             <span className="text-[9px] font-mono text-white/15">
              v0.3.0
            </span>
            <button
               onClick={() => setIsSettingsOpen(true)}
               className="text-white/20 hover:text-white transition-colors"
            >
              <Settings2 size={14} />
            </button>
          </div>
        </div>

        <div className="mx-4 h-[1px] bg-white/[0.04]" />

        {/* Content */}
        <div className="px-4 py-4 flex flex-col gap-3 min-h-[120px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {config.widgets.map((widgetCfg) => {
              if (!widgetCfg.enabled) return null;

              const WidgetComponent = WIDGET_REGISTRY[widgetCfg.id];
              const data = statsMap.get(widgetCfg.id);

              if (!WidgetComponent || !data) return null;

              return (
                <motion.div
                  key={widgetCfg.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                >
                  <WidgetComponent data={data} />
                </motion.div>
              );
            })}
          </AnimatePresence>

          {stats.length === 0 && !error && (
             <div className="text-center text-xs text-white/20 font-mono py-4">Waiting for data...</div>
          )}
           
           {/* If all disabled */}
           {config.widgets.every(w => !w.enabled) && (
             <div className="text-center text-xs text-white/20 font-mono py-8">
               No indicators active.
             </div>
           )}
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-neon-pink), var(--color-neon-green), transparent)",
          }}
        />

        {/* Settings Modal Overlay */}
        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsModal
              config={config}
              onSave={handleSaveConfig}
              onClose={() => setIsSettingsOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
