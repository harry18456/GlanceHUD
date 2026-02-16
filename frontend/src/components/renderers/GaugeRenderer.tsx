import React from 'react';
import { RenderConfig, DataPayload } from "../../types";

interface Props {
    config: RenderConfig;
    data?: DataPayload;
}

export const GaugeRenderer: React.FC<Props> = ({ config, data }) => {
    const value = typeof data?.value === 'number' ? data.value : 0;
    const min = (config.props?.min as number) || 0;
    const max = (config.props?.max as number) || 100;
    const unit = (config.props?.unit as string) || "";
    const colorClass = (data?.props?.color as string) || (config.props?.color as string) || "text-green-500";
    
    // Calculate stroke offset
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(Math.max((value - min) / (max - min), 0), 1);
    const dashoffset = circumference * (1 - progress);

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="relative w-32 h-32">
                 {/* Background Circle */}
                 <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-gray-700/30"
                    />
                    {/* Foreground Circle */}
                    <circle
                        cx="64"
                        cy="64"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                        strokeLinecap="round"
                        className={`${colorClass} transition-all duration-500 ease-out`}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-2xl font-bold ${colorClass}`}>
                        {data?.label || `${value}${unit}`}
                    </span>
                    <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">
                        {config.title}
                    </span>
                </div>
            </div>
            {data?.items && typeof data.items === 'object' && !Array.isArray(data.items) && (
                 <div className="mt-2 text-xs text-gray-500 flex gap-2">
                    {Object.entries(data.items).map(([k, v]) => (
                        <span key={k}>{v}</span>
                    ))}
                 </div>
            )}
        </div>
    );
};
