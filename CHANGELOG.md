# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
