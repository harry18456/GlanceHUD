declare module "*/bindings/glancehud" {
    export const SystemService: {
        GetSystemStats(): Promise<any[]>;
        GetConfig(): Promise<any>;
        SaveConfig(config: any): Promise<void>;
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
