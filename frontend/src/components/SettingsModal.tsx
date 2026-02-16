import { useState } from "react";
import { motion, Reorder } from "framer-motion";
import { Check, X, GripVertical } from "lucide-react";
import { AppConfig, WidgetConfig } from "../../bindings/glancehud/internal/modules/models";

interface SettingsModalProps {
  config: AppConfig;
  onSave: (newConfig: AppConfig) => void;
  onClose: () => void;
}

export function SettingsModal({ config: initialConfig, onSave, onClose }: SettingsModalProps) {
  const [widgets, setWidgets] = useState(initialConfig.widgets);

  const handleToggle = (id: string) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleSave = () => {
    onSave({ ...initialConfig, widgets });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-900/50">
          <span className="text-xs font-mono font-bold text-white/80 uppercase tracking-widest">
            CONFIGURE
          </span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <Reorder.Group axis="y" values={widgets} onReorder={setWidgets} className="flex flex-col gap-2">
            {widgets.map((widget) => (
              <Reorder.Item
                key={widget.id}
                value={widget}
                className={`
                  relative flex items-center p-3 rounded-lg border transition-colors select-none
                  ${widget.enabled ? "bg-white/5 border-white/10" : "bg-transparent border-white/5 opacity-50"}
                `}
              >
                <div className="mr-3 cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60">
                  <GripVertical size={16} />
                </div>
                
                <span className="flex-1 font-mono text-xs text-white/90 uppercase tracking-wider">
                  {widget.id}
                </span>

                <button
                  onClick={() => handleToggle(widget.id)}
                  className={`
                    w-9 h-5 rounded-full flex items-center px-0.5 transition-colors relative
                    ${widget.enabled ? "bg-neon-green" : "bg-white/10"}
                  `}
                >
                  <motion.div
                    layout
                    className={`w-4 h-4 rounded-full shadow-sm ${widget.enabled ? "bg-black" : "bg-white/40"}`}
                    animate={{ x: widget.enabled ? 16 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        <div className="p-3 border-t border-white/5 bg-zinc-900/50 flex justify-end">
          <button
            onClick={handleSave}
            className="
              flex items-center gap-2 px-4 py-2
              bg-neon-green/10 hover:bg-neon-green/20
              border border-neon-green/20 hover:border-neon-green/40
              rounded text-xs font-mono font-bold text-neon-green uppercase tracking-wide
              transition-all
            "
          >
            <Check size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
