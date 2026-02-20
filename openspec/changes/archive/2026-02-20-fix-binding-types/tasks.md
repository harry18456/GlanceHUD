## 1. Update bindings.d.ts

- [x] 1.1 Update `SaveConfig` to accept `import("./types").AppConfig` instead of `any`.
- [x] 1.2 Update `RegisterSidecar` to accept `config` as `import("./types").RenderConfig | null` and `schema` as `import("./types").ConfigSchema[]` instead of `any`.
- [x] 1.3 Update `UpdateSidecarData` to accept `data` as `import("./types").DataPayload | null` and return `Promise<Record<string, any>>` instead of `any`.

## 2. Verify

- [x] 2.1 Run frontend TypeScript compiler/linter to ensure no type errors are introduced by these changes.
- [x] 2.2 Verify that frontend components using these bindings still compile correctly.
