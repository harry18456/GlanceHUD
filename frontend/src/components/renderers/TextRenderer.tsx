import React from 'react';
import { RenderConfig, DataPayload, KeyValueItem } from "../../types";

interface Props {
    config: any; // protocol.RenderConfig
    data?: any; // protocol.DataPayload
}

export const TextRenderer: React.FC<Props> = ({ config, data }) => {
    const value = data?.value || "-";
    const label = data?.label || config.title;
    const items = data?.items as any[]; // protocol.KeyValueItem[]

    return (
        <div className="flex flex-col p-4 w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 text-sm uppercase tracking-wider">{label}</span>
                <span className="text-xl font-bold font-mono">{value}</span>
            </div>
            {/* If items exist (Minimal Mode details), show them */}
            {items && Array.isArray(items) && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                    {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex flex-col">
                            <span className="text-xs text-gray-500">{item.key}:</span>
                            <span className="text-sm font-medium">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
