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

export interface ModuleInfo {
    moduleId: string;       // short config ID: "cpu", "disk", etc.
    config: RenderConfig;   // display template
    enabled: boolean;       // whether the module is active
}

export interface UpdateEvent {
    id: string;
    data: DataPayload;
}

export interface WidgetConfig {
    id: string;
    enabled: boolean;
    props?: Record<string, any>;
}

export interface AppConfig {
    widgets: WidgetConfig[];
    theme: string;
    minimalMode: boolean;
}

export type ConfigType = "text" | "number" | "bool" | "select" | "checkboxes" | "button";

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
