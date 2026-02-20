## ADDED Requirements

### Requirement: Strongly Typed SystemService Bindings

The frontend `SystemService` bindings MUST define explicit types for all data exchanging methods to ensure type safety between the frontend and the Go backend.

#### Scenario: Registering a Sidecar Widget

- **WHEN** a sidecar widget is registered via `RegisterSidecar`
- **THEN** it MUST accept the sidecar `id` as a string
- **AND** it MUST accept `config` as a `RenderConfig` or null
- **AND** it MUST accept `schema` as an array of `ConfigSchema`
- **AND** it MUST return a Promise of `void`

#### Scenario: Updating Sidecar Data

- **WHEN** a sidecar widget pushes data via `UpdateSidecarData`
- **THEN** it MUST accept the sidecar `id` as a string
- **AND** it MUST accept `data` as a `DataPayload` or null
- **AND** it MUST return a Promise of merged `props` record

#### Scenario: Saving Application Configuration

- **WHEN** the application configuration is saved via `SaveConfig`
- **THEN** it MUST accept `config` as an `AppConfig`
- **AND** it MUST return a Promise of `void`
