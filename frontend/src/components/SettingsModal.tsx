import React, { useState, useEffect } from 'react';
import { SystemService } from "../../bindings/glancehud";
import { AppConfig, WidgetConfig } from "../../bindings/glancehud/internal/modules/models";
import { ConfigSchema, RenderConfig } from "../types";
import { DynamicForm } from './DynamicForm';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    modules: RenderConfig[]; // Available modules
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, modules }) => {
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [selectedModuleID, setSelectedModuleID] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<Record<string, ConfigSchema[]>>({});

    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const loadConfig = async () => {
        try {
            const cfg = await SystemService.GetConfig();
            setConfig(cfg);
            
            // Load schemas for all modules
            const schemasMap: Record<string, ConfigSchema[]> = {};
            for (const mod of modules) {
                const schema = await SystemService.GetModuleConfigSchema(mod.id);
                if (schema) {
                    schemasMap[mod.id] = schema;
                }
            }
            setSchemas(schemasMap);
            
            if (modules.length > 0 && !selectedModuleID) {
                setSelectedModuleID(modules[0].id);
            }
        } catch (e) {
            console.error("Failed to load config:", e);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        try {
            await SystemService.SaveConfig(config);
            onClose();
        } catch (e) {
            console.error("Failed to save config:", e);
        }
    };

    const handleWidgetChange = (widgetId: string, enabled: boolean) => {
        if (!config) return;
        const newWidgets = config.widgets.map(w => {
            if (w.id === widgetId) {
                return { ...w, enabled };
            }
            return w;
        });
        setConfig({ ...config, widgets: newWidgets });
    };

    const handlePropsChange = (widgetId: string, newProps: any) => {
         if (!config) return;
         const newWidgets = config.widgets.map(w => {
            if (w.id === widgetId) {
                return { ...w, props: newProps };
            }
            return w;
        });
        setConfig({ ...config, widgets: newWidgets });
    };
    
    // Find active widget config
    const activeWidget = config?.widgets.find(w => w.id === selectedModuleID);
    const activeSchema = selectedModuleID ? schemas[selectedModuleID] : [];

    if (!isOpen || !config) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-[800px] h-[600px] flex overflow-hidden border border-gray-700">
                {/* Sidebar */}
                <div className="w-1/3 bg-gray-900/50 p-4 border-r border-gray-700 overflow-y-auto">
                    <h2 className="text-lg font-bold mb-4 text-white">Modules</h2>
                    <div className="flex flex-col gap-2">
                        {modules.map(mod => {
                             const isEnabled = config.widgets.find(w => w.id === mod.id)?.enabled;
                             return (
                                <div 
                                    key={mod.id} 
                                    className={`p-2 rounded cursor-pointer transition-colors flex items-center justify-between ${selectedModuleID === mod.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                                    onClick={() => setSelectedModuleID(mod.id)}
                                >
                                    <span className="text-sm font-medium">{mod.title}</span>
                                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={isEnabled || false}
                                            onChange={(e) => handleWidgetChange(mod.id, e.target.checked)}
                                            className="w-4 h-4 cursor-pointer"
                                        />
                                    </div>
                                </div>
                             );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="w-2/3 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">
                            {modules.find(m => m.id === selectedModuleID)?.title} Settings
                        </h2>
                         <button 
                            onClick={onClose}
                            className="text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                         {activeWidget && activeSchema && activeSchema.length > 0 ? (
                            <DynamicForm 
                                schema={activeSchema}
                                values={activeWidget.props || {}}
                                onChange={(vals) => handlePropsChange(activeWidget.id, vals)}
                            />
                         ) : (
                             <div className="text-gray-500 italic">No configuration available for this module.</div>
                         )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
