# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [0.6.1] — 2026-02-18

### Fixed

- **Windows Release**: 修正 artifact pattern，從 `build/windows/nsis/*.exe`（只抓到 WebView2 bootstrapper）改為 `bin/*-installer.exe`（正確的 NSIS installer 輸出路徑）。

---

## [0.6.0] — 2026-02-18

### Added

- **Release Workflow**: GitHub Actions 自動建置並發布 Windows Installer (.exe)、Linux AppImage/deb/rpm、macOS zip，由 tag push (`v*`) 或手動觸發。

### Fixed

- **Linux CI**: 將 `libgtk-3-dev` / `libwebkit2gtk-4.1-dev` 安裝步驟移至 `wails3 CLI` 編譯之前，解決 cgo 編譯時找不到 pkg-config 的問題。
- **Windows CI**: `choco install nsis` 後將 NSIS 目錄加入 `$GITHUB_PATH`，解決 `makensis` 找不到的問題。
- **Linux Packaging**: 修正 `build/linux/nfpm/nfpm.yaml` 中所有 `.exe` 殘留路徑，改為正確的 Linux binary 名稱 (`GlanceHUD`)。

### Changed

- CI workflow 恢復自動觸發（push / PR to master）。
- Release workflow 新增 `workflow_dispatch` 支援手動觸發建置。

---

## [0.5.1] — 2026-02-18

### Changed

- **Pre-commit configuration**: 優化 Windows 相容性，改用 `npm run lint/format` 取代直接呼叫 `npx`，解決路徑解析問題。
- **Version Bump**: 升級至 0.5.1 以包含 pre-commit 設定變更。

---

## [0.5.0] — 2026-02-18

### Added

- **前端 Coding Style**: ESLint v9 (typescript-eslint + react-hooks) + Prettier，統一程式碼風格。
- **後端 Coding Style**: golangci-lint 配置 (errcheck, govet, staticcheck, unused, ineffassign)。
- **Go Unit Tests**: 43 個測試覆蓋 config (withDefaults, Save/Load, JSON round-trip)、protocol (序列化, omitempty)、widget_source (Sidecar 生命週期, TTL)。
- **CI/CD 強化**: GitHub Actions 拆分為 Go / Frontend 兩個 jobs，新增 lint + test steps。

### Changed

- 前端清理 dead code：刪除 `buildTypeMap`、`idx`、`labelFontSize` 等 unused variables。
- 修正 SettingsModal 的 `catch` 語法和 React hooks 依賴陣列。
- CI `go build` 改為只建置主套件，避免 Wails scaffold 目錄干擾。

---

## [0.4.0] — 2026-02-17

### Added

- **HTTP Push API** (`POST /api/widget`): Lazy Registration, Settings Schema, Settings Feedback Loop.
- **Offline 機制**: 10 秒無心跳自動標記離線，灰階降透明度顯示。
- **Sidecar 範例**: `examples/python-sidecar.py` (5 種 Widget Demo) 和 `examples/gpu-monitor.py` (NVIDIA GPU 監控)。
- **狀態查詢 (Pull)**: `GET /api/stats` 返回所有 Widget 快照，支援 `?id=` 過濾。
- **Sidecar 刪除**: Settings 面板可刪除 Sidecar Widget。

### Changed

- 統一 Native / Sidecar 為相同 `WidgetSource` 介面，後端零冗餘邏輯。

---

## [0.3.0] — 2026-02-15

### Added

- **System Tray 整合**: 支援最小化到系統匣。
- **視窗控制**: 鎖定模式 (穿透) vs 編輯模式 (拖放佈局)。
- **動態擴展格線**: 編輯模式下拖曳至邊緣自動擴展欄位。

---

## [0.2.0] — 2026-02-10

### Added

- **原子化顯示組件**: `gauge`, `bar-list`, `key-value`, `sparkline`, `text`。
- **事件驅動更新**: RenderConfig (結構) 與 DataPayload (數據) 分離。
- **設定協議**: 模組回傳 Schema，前端自動產生設定表單。
- **效能優化**: 後端 Diff Check (`reflect.DeepEqual`)。
- **Glass-morphism UI**: 磨砂玻璃質感、狀態色系、Framer Motion 動畫。

---

## [0.1.0] — 2026-02-01

### Added

- **初始版本**: Wails v3 + React 架構。
- **Push-Based 架構**: 後端推播資料到前端。
- **內建模組**: CPU (Sparkline), Memory (Gauge), Disk (Bar-list), Network (Key-value)。
- **Zero-Config Start**: 自動偵測系統分割區並產生預設設定。
