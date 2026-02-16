import React, { useState, useEffect } from 'react';
import { ConfigSchema } from '../types';

interface Props {
    schema: ConfigSchema[];
    values: Record<string, any>;
    onChange: (values: Record<string, any>) => void;
}

export const DynamicForm: React.FC<Props> = ({ schema, values, onChange }) => {
    const [formData, setFormData] = useState(values);

    useEffect(() => {
        setFormData(values);
    }, [values]);

    const handleChange = (key: string, value: any) => {
        const newData = { ...formData, [key]: value };
        setFormData(newData); // Local state for responsiveness
        onChange(newData); // Bubble up
    };

    return (
        <div className="flex flex-col gap-4">
            {schema.map((field) => (
                <div key={field.name || field.label} className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-gray-300">
                        {field.label}
                    </label>
                    
                    {field.type === 'text' && (
                        <input
                            type="text"
                            value={formData[field.name!] || ''}
                            onChange={(e) => handleChange(field.name!, e.target.value)}
                            className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                        />
                    )}

                    {field.type === 'number' && (
                        <input
                            type="number"
                            value={formData[field.name!] || 0}
                            onChange={(e) => handleChange(field.name!, Number(e.target.value))}
                            className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                        />
                    )}

                    {field.type === 'bool' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!formData[field.name!]}
                                onChange={(e) => handleChange(field.name!, e.target.checked)}
                                className="w-5 h-5 accent-blue-500"
                            />
                            <span className="text-xs text-gray-400">Enable</span>
                        </div>
                    )}

                    {field.type === 'select' && (
                         <select
                            value={formData[field.name!] || ''}
                            onChange={(e) => handleChange(field.name!, e.target.value)}
                            className="bg-gray-700/50 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                        >
                            {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                </div>
            ))}
        </div>
    );
};
