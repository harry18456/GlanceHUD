import { useState, useEffect } from 'react';
import { SystemService } from "../bindings/glancehud";
import { RenderConfig, DataPayload, UpdateEvent } from "./types";
import { Events } from "@wailsio/runtime";
import { UniversalWidget } from './components/UniversalWidget';
import { SettingsModal } from './components/SettingsModal';
import './style.css';

function App() {
    const [configs, setConfigs] = useState<RenderConfig[]>([]);
    const [dataMap, setDataMap] = useState<Record<string, DataPayload>>({});
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        // 1. Get initial configuration (Templates)
        loadModules();

        // 2. Listen for updates (Data Patch)
        const unsub = Events.On("stats:update", (event) => {
             const payload = event.data as UpdateEvent;
             if (payload && payload.id && payload.data) {
                 setDataMap(prev => ({
                     ...prev,
                     [payload.id]: payload.data
                 }));
             }
        });

        // Listen for config changes (if any) or just reload modules when settings close
        return () => {
            unsub();
        };
    }, []);

    const loadModules = () => {
        SystemService.GetModules().then((modules) => {
            console.log("Loaded modules:", modules);
            setConfigs(modules);
        });
    };

    const handleSettingsClose = () => {
        setIsSettingsOpen(false);
        // Reload modules/config in case something changed (e.g. enabled/disabled)
        loadModules();
         // Also clear data? Maybe not needed.
    };

    return (
        <div id="app" className="drag-region flex flex-col gap-4 p-4 min-h-screen bg-black/50 backdrop-blur-md text-white relative">
             {/* Settings Button */}
             <button 
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-40 no-drag"
                onClick={() => setIsSettingsOpen(true)}
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.43.055 1.012-.412 1.565l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395" />
                </svg>
             </button>

             {configs.map(cfg => (
                 <div key={cfg.id} className="bg-gray-800/60 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 backdrop-blur-sm no-drag">
                     <UniversalWidget 
                        config={cfg} 
                        data={dataMap[cfg.id]} 
                     />
                 </div>
             ))}
             {configs.length === 0 && (
                 <div className="text-center text-gray-500 mt-10">
                     Loading modules...
                 </div>
             )}

             <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={handleSettingsClose}
                modules={configs}
             />
        </div>
    );
}

export default App;
