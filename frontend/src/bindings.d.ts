declare module "*/bindings/glancehud/internal/service" {
    export const SystemService: {
        GetSystemStats(): Promise<any[]>;
        GetConfig(): Promise<import("./types").AppConfig>;
        SaveConfig(config: any): Promise<void>;
        GetModules(): Promise<import("./types").ModuleInfo[]>;
        GetModuleConfigSchema(moduleID: string): Promise<import("./types").ConfigSchema[]>;
        GetCurrentData(): Promise<Record<string, import("./types").DataPayload>>;
        RegisterSidecar(id: string, config: any): Promise<void>;
        UpdateSidecarData(id: string, data: any): Promise<void>;
        RemoveSidecar(id: string): Promise<void>;
    };
}

declare module "*/bindings/glancehud/internal/modules/models" {
    export interface WidgetConfig {
        id: string;
        enabled: boolean;
        props?: Record<string, any>;
    }

    export interface AppConfig {
        widgets: WidgetConfig[];
        theme: string;
    }

    export interface ModuleData {
        id: string;
        label: string;
        value: any;
        icon: string;
    }
}
