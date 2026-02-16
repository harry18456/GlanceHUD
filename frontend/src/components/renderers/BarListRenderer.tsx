import React from 'react';
import { RenderConfig, DataPayload, BarListItem } from "../../types";

interface Props {
    config: any;
    data?: any;
}

export const BarListRenderer: React.FC<Props> = ({ config, data }) => {
    const items = (data?.items as any[]) || [];
    const headers = (config.props?.headers as string[]) || [];

    return (
        <div className="p-4 w-full h-full flex flex-col gap-3 font-mono text-sm max-h-60 overflow-y-auto custom-scrollbar">
             {headers.length > 0 && (
                <div className="flex justify-between text-xs text-gray-500 mb-1 border-b border-gray-700/50 pb-1">
                    {headers.map((h, i) => <span key={i}>{h}</span>)}
                </div>
            )}
            
            {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold truncate w-20">{item.label}</span>
                         <span className="text-xs text-gray-400">{item.value}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700/30 h-1.5 rounded-full overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${item.percent}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};
