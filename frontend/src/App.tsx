import { useState, useEffect } from 'react';
import { SystemService } from "../bindings/glancehud";
import { RenderConfig, DataPayload, UpdateEvent } from "./types";
import { Events } from "@wailsio/runtime";
import { UniversalWidget } from './components/UniversalWidget';
import './style.css';

function App() {
    const [configs, setConfigs] = useState<RenderConfig[]>([]);
    const [dataMap, setDataMap] = useState<Record<string, DataPayload>>({});

    useEffect(() => {
        // 1. Get initial configuration (Templates)
        SystemService.GetModules().then((modules) => {
            console.log("Loaded modules:", modules);
            setConfigs(modules);
        });

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

        return () => {
            unsub();
        };
    }, []);

    return (
        <div id="app" className="drag-region flex flex-col gap-4 p-4 min-h-screen bg-black/50 backdrop-blur-md text-white">
             {configs.map(cfg => (
                 <div key={cfg.id} className="bg-gray-800/60 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 backdrop-blur-sm">
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
        </div>
    );
}

export default App;
