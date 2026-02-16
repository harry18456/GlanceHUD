export type ComponentType = "gauge" | "bar-list" | "key-value" | "group" | "sparkline" | "text";

export interface RenderConfig {
    id: string;
    type: ComponentType;
    title: string;
    props?: Record<string, any>;
}

export interface DataPayload {
    value?: any;
    label?: string;
    displayValue?: string;
    items?: BarListItem[] | KeyValueItem[];
    props?: Record<string, any>;
}

export interface BarListItem {
    label: string;
    percent: number;
    value: string;
}

export interface KeyValueItem {
    key: string;
    value: string;
    icon?: string;
}

export interface UpdateEvent {
    id: string;
    data: DataPayload;
}

export type ConfigType = "text" | "number" | "bool" | "select" | "button";

export interface ConfigSchema {
    name?: string;
    label: string;
    type: ConfigType;
    default?: any;
    options?: SelectOption[];
    action?: string;
}

export interface SelectOption {
    label: string;
    value: string;
}
