import React from 'react';
import { RenderConfig, DataPayload } from "../types";
import { GaugeRenderer } from './renderers/GaugeRenderer';
import { BarListRenderer } from './renderers/BarListRenderer';
import { KVRenderer } from './renderers/KVRenderer';
import { TextRenderer } from './renderers/TextRenderer';
import { useContainerSize } from '../lib/useContainerSize';

interface Props {
    config: RenderConfig;
    data?: DataPayload;
}

export const UniversalWidget: React.FC<Props> = ({ config, data }) => {
    const [containerRef, { width, height }] = useContainerSize();

    // Dynamic Prop Override: Merge static config.props with dynamic data.props
    const effectiveConfig = {
        ...config,
        props: {
            ...config.props,
            ...data?.props
        }
    };

    const renderContent = () => {
        switch (config.type) {
            case "gauge":
                return <GaugeRenderer config={effectiveConfig} data={data} containerWidth={width} containerHeight={height} />;
            case "bar-list":
                return <BarListRenderer config={effectiveConfig} data={data} containerWidth={width} containerHeight={height} />;
            case "key-value":
                return <KVRenderer config={effectiveConfig} data={data} containerWidth={width} containerHeight={height} />;
            case "text":
                return <TextRenderer config={effectiveConfig} data={data} containerWidth={width} containerHeight={height} />;
            // Placeholders for Phase 3
            case "group":
            case "sparkline":
                return <div className="text-xs text-gray-500">[Pending: {config.type}]</div>;
            default:
                return (
                    <div className="p-4 text-red-500">
                        Unknown Widget Type: {config.type}
                    </div>
                );
        }
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            {renderContent()}
        </div>
    );
};
