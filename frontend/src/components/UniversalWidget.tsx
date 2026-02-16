import React from 'react';
import { RenderConfig, DataPayload } from "../types";
import { GaugeRenderer } from './renderers/GaugeRenderer';
// import { BarListRenderer } from './renderers/BarListRenderer';
// import { KVRenderer } from './renderers/KVRenderer';
// import { TextRenderer } from './renderers/TextRenderer';
import { BarListRenderer } from './renderers/BarListRenderer';
import { KVRenderer } from './renderers/KVRenderer';
import { TextRenderer } from './renderers/TextRenderer';

interface Props {
    config: RenderConfig;
    data?: DataPayload;
}

export const UniversalWidget: React.FC<Props> = ({ config, data }) => {
    switch (config.type) {
        case "gauge":
            return <GaugeRenderer config={config} data={data} />;
        case "bar-list":
            return <BarListRenderer config={config} data={data} />;
        case "key-value":
            return <KVRenderer config={config} data={data} />;
        case "text": // Or minimal mode
            return <TextRenderer config={config} data={data} />;
        default:
            return (
                <div className="p-4 text-red-500">
                    Unknown Widget Type: {config.type}
                </div>
            );
    }
};
