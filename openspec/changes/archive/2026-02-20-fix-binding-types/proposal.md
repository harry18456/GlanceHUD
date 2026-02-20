## Why

目前前端負責與後端核心系統溝通的介面 `frontend/src/bindings.d.ts` 大量使用了 `any` 型別。由於 Wails 框架依賴動態產生的 JavaScript 呼叫 Go 函式，前後端資料結構不一致的風險很高，明確的型別定義能提升除錯效率與程式碼可維護性。

## What Changes

- 將 `bindings.d.ts` 內的遺漏或泛用的型別定義補齊。
- 例如：`RegisterSidecar` 的 `config` 與 `schema` 應指向 `RenderConfig` 及 `ConfigSchema[]` 型別；`UpdateSidecarData` 的 `data` 應為 `DataPayload` 等。

## Capabilities

### Modified Capabilities

- `frontend-bindings`: 提升由 Wails 動態產出的 SystemService 以及核心資料交換介面的型別安全性。

## Impact

- `frontend/src/bindings.d.ts`: 更新相關的方法標記，採用 `frontend/src/types.ts` 中的定義。
