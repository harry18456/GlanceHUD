declare module "*/bindings/glancehud/internal/service" {
  export const SystemService: {
    GetSystemStats(): Promise<any[]>
    GetConfig(): Promise<import("./types").AppConfig>
    SaveConfig(config: import("./types").AppConfig): Promise<void>
    GetModules(): Promise<import("./types").ModuleInfo[]>
    GetModuleConfigSchema(moduleID: string): Promise<import("./types").ConfigSchema[]>
    GetCurrentData(): Promise<Record<string, import("./types").DataPayload>>
    RegisterSidecar(
      id: string,
      config: import("./types").RenderConfig | null,
      schema: import("./types").ConfigSchema[]
    ): Promise<void>
    UpdateSidecarData(
      id: string,
      data: import("./types").DataPayload | null
    ): Promise<Record<string, any>>
    RemoveSidecar(id: string): Promise<void>
  }
}

declare module "*/bindings/glancehud/internal/modules/models" {
  export interface WidgetConfig {
    id: string
    enabled: boolean
    props?: Record<string, any>
  }

  export interface AppConfig {
    widgets: WidgetConfig[]
    theme: string
  }

  export interface ModuleData {
    id: string
    label: string
    value: any
    icon: string
  }
}
