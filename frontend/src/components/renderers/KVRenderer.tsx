import React from 'react';
import { RenderConfig, DataPayload, KeyValueItem } from "../../types";

interface Props {
    config: any;
    data?: any;
}

export const KVRenderer: React.FC<Props> = ({ config, data }) => {
    const items = (data?.items as any[]) || [];
    const layout = config.props?.layout === 'row' ? 'flex flex-row justify-between' : 'flex flex-col gap-2';

    return (
        <div className={`p-4 w-full h-full ${layout}`}>
            {items.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                    <span className="text-xs text-gray-400 uppercase">{item.key}</span>
                     <div className="flex items-center gap-1">
                        {/* Icon placeholder if we have icon lib later */}
                        {item.icon && <span className="text-xs"></span>} 
                        <span className="text-lg font-bold">{item.value}</span>
                     </div>
                </div>
            ))}
            {items.length === 0 && (
                <div className="text-gray-500 text-sm">No Data</div>
            )}
        </div>
    );
};
