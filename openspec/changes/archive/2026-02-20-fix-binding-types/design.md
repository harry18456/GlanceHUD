## Context

The `frontend/src/bindings.d.ts` file currently defines the `SystemService` interface using `any` types for critical arguments like configurations and payloads. This makes it unsafe and prone to runtime errors if backend interfaces change or if incorrect data is passed during development. The backend Go types and Wails-generated JS bindings already enforce these types, but the TypeScript declarations are missing them.

## Goals / Non-Goals

**Goals:**

- Replace `any` types in `bindings.d.ts` with their corresponding strict types.
- Ensure all type dependencies are properly imported or available.
- Keep the `SystemService` interface strictly aligned with `internal/service/system_service.go`.

**Non-Goals:**

- We will not refactor the Wails-generated JavaScript files themselves.
- We will not change any Go backend logic or types.
- We will not update other frontend files unless they break due to the strict typing in `bindings.d.ts`.

## Decisions

### Decision 1: Mapping the Types

Based on the exploration, we will map the types as follows:

- `RegisterSidecar(id, config, schema)` -> `RegisterSidecar(id: string, config: protocol.RenderConfig | null, schema: protocol.ConfigSchema[]): Promise<void>`
- `UpdateSidecarData(id, data)` -> `UpdateSidecarData(id: string, data: protocol.DataPayload | null): Promise<Record<string, any>>`
- `SaveConfig(config)` -> `SaveConfig(config: AppConfig): Promise<void>`

**Note**: To avoid polluting `bindings.d.ts` with excessive imports, we will use inline `import("./types").X` where appropriate, or rely on the existing imports if applicable.
