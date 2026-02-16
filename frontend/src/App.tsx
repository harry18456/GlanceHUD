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
             console.log("Stats Update Received:", event);
             const payload = event.data as UpdateEvent;
             if (payload && payload.id) {
                 console.log(`Updating ${payload.id}:`, payload.data);
                 setDataMap(prev => ({
                     ...prev,
                     [payload.id]: payload.data
                 }));
             } else {
                 console.warn("Invalid payload:", payload);
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
            // Fetch initial data immediately to avoid race condition
            return SystemService.GetCurrentData();
        }).then((data) => {
             console.log("Initial data:", data);
             if (data) {
                 setDataMap(data);
             }
        });
    };

    const handleSettingsClose = () => {
        setIsSettingsOpen(false);
        // Reload modules/config in case something changed (e.g. enabled/disabled)
        loadModules();
         // Also clear data? Maybe not needed.
    };

    return (
        <div id="app" className="drag-region flex flex-col gap-4 p-4 h-screen overflow-y-auto bg-black/50 backdrop-blur-md text-white relative">
             {/* Settings Button (Cog) */}
             <button 
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-40 no-drag bg-gray-900/50 rounded-full"
                onClick={() => setIsSettingsOpen(true)}
             >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.159.956c.03.183.137.347.295.45.244.16.505.297.776.406.183.074.316.223.356.41l.204 1.05c.092.47-.32 1.002-.87 1.002h-1.093a.933.933 0 0 1-.87-1.002l.16-1.05c.04-.187.172-.336.355-.41.27-.11.531-.246.775-.406a.715.715 0 0 0 .296-.45l.159-.956ZM12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-1.657 6.84c-.09.542-.56.94-1.11.94H8.14c-.55 0-1.02-.398-1.11-.94l-.159-.956a.715.715 0 0 0-.295-.45 6.002 6.002 0 0 0-.776-.406.714.714 0 0 0-.356-.41l-.204-1.05c-.092-.47.32-1.002.87-1.002h1.093c.58 0 1.049.52.87 1.002l-.16 1.05c-.04.187-.172.336-.355.41-.27.11-.531.246-.775.406-.159.103-.266.267-.296.45l-.159.956ZM6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm11.343-2.16c-.09.542-.56.94-1.11.94h-1.093c-.55 0-1.02-.398-1.11-.94l-.159-.956a.715.715 0 0 0-.295-.45 6.002 6.002 0 0 0-.776-.406.714.714 0 0 0-.356-.41l-.204-1.05c-.092-.47.32-1.002.87-1.002h1.093c.58 0 1.049.52.87 1.002l-.16 1.05c-.04.187-.172.336-.355.41-.27.11-.531.246-.775.406-.159.103-.266.267-.296.45l-.159.956ZM18 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM6.25 6.25a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM3 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 3 12ZM6.25 17.75a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM12 20.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM17.75 17.75a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM21 12a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 21 12ZM17.75 6.25a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0Z" />
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
