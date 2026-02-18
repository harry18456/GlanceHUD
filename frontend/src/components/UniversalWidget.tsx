import React from 'react';
import { RenderConfig, DataPayload } from "../types";
import { GaugeRenderer } from './renderers/GaugeRenderer';
import { BarListRenderer } from './renderers/BarListRenderer';
import { KVRenderer } from './renderers/KVRenderer';
import { TextRenderer } from './renderers/TextRenderer';
import { SparklineRenderer } from './renderers/SparklineRenderer';
import { useContainerSize } from '../lib/useContainerSize';

interface Props {
    config: RenderConfig;
    data?: DataPayload;
    history?: number[];
}

export const UniversalWidget: React.FC<Props> = ({ config, data, history: externalHistory }) => {
    const [containerRef, { width, height }] = useContainerSize();

    // Rolling history buffer — accumulated in App.tsx, trimmed here to maxPoints
    const maxPoints = (config.props?.maxPoints as number) || 30;
    const history = (externalHistory ?? []).slice(-maxPoints);

    const effectiveConfig = {
        ...config,
        props: {
            ...config.props,
            ...data?.props
        }
    };

    const isOffline = effectiveConfig.props.isOffline === true;

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
            case "sparkline":
                return <SparklineRenderer config={effectiveConfig} data={data} history={history} containerWidth={width} containerHeight={height} />;
            // Placeholder
            case "group":
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
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden',
                position: 'relative',
                filter: isOffline ? 'grayscale(100%) opacity(0.6)' : 'none',
                transition: 'filter 0.3s ease-in-out'
            }}
        >
            {renderContent()}
            {isOffline && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0, 
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        zIndex: 10
                    }}
                >
                    <span 
                        style={{
                            backgroundColor: '#333',
                            color: '#ccc',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            border: '1px solid #555'
                        }}
                    >
                        OFFLINE
                    </span>
                </div>
            )}
        </div>
    );
};
