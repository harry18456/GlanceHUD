# GlanceHUD 開發指南 (Development Guide)

本文件旨在協助開發者了解 GlanceHUD 的專案結構、建置流程以及如何貢獻程式碼。

## 1. 專案結構 (Project Structure)

GlanceHUD 採用 **Golang (Backend)** + **React/Vite (Frontend)** 的混合架構 (Based on Wails v3)。

```
GlanceHUD/
├── build/                  # Wails 建置設定
├── docs/                   # 專案文件 (API, PROTOCOL, WIDGET)
├── examples/               # Sidecar 範例程式碼 (Python)
├── frontend/               # 前端原始碼 (React + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── renderers/  # [核心] 各種 Widget 的渲染器 (Source of Truth for UI)
│   │   │   └── ...
│   │   ├── lib/            # 工具函式 (statusColor, iconRegistry)
│   │   └── App.tsx         # 前端入口與主要 Layout 邏輯
│   └── ...
├── internal/               # 後端原始碼 (Golang)
│   ├── modules/            # Native Modules 實作 (CPU, Mem, Disk...)
│   ├── protocol/           # 通訊協議定義 (Structs)
│   ├── service/            #核心服務 (SystemService, APIService)
│   └── ...
├── main.go                 # 程式進入點 (Wails App 初始化)
└── wails.json              # Wails 專案設定
```

## 2. 開發環境建置 (Setup)

### 必要工具

1.  **Go** (1.21+)
2.  **Node.js** (18+) & **npm**
3.  **Wails CLI** (v3 alpha)

### 啟動開發模式

在專案根目錄執行：

```bash
# 同時啟動 Backend 與 Frontend (帶有 Hot Reload)
wails3 dev
```

這會自動啟動 Vite Dev Server (Frontend) 並編譯執行 Go Binary (Backend)。

## 3. 如何新增功能

### 3.1 新增一個 Native Module (Go)

1.  在 `internal/modules/` 建立新的 `my_module.go`。
2.  實作 `Module` 介面 (包含 `Update()`, `GetRenderConfig()`, `GetConfigSchema()`)。
3.  在 `internal/service/system_service.go` 的 `NewSystemService` 中註冊該模組。

### 3.2 新增一個 Frontend Renderer (TSX)

1.  在 `frontend/src/components/renderers/` 建立新的 `MyRenderer.tsx`。
2.  在 `frontend/src/components/HudGrid.tsx` 中的 `renderWidget` switch-case 加入新的 type 對應。
3.  (Optional) 更新 `docs/WIDGET.md` 說明新 Renderer 支援的 Props。

### 3.3 新增 Sidecar 支援

Sidecar 不需修改 GlanceHUD 原始碼。
僅需編寫外部腳本 (如 Python) 並遵循 `docs/PROTOCOL.md` 與 `docs/API.md` 的規範推送數據即可。

## 4. Documentation

- **Widget 參數**: 請參閱 `docs/WIDGET.md` (這是 Single Source of Truth)。
- **API 規格**: 請參閱 `docs/API.md`。
- **底層協議**: 請參閱 `docs/PROTOCOL.md`。

## 5. Build (發布)

```bash
# 建置 Windows 執行檔 (Output: bin/GlanceHUD.exe)
wails3 task build:windows
```
