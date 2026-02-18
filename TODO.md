# TODO

> 由程式碼審查自動整理，涵蓋文件錯誤、程式碼清理、架構改善等所有項目。
> 不分優先順序，逐一確認後打勾即可。

---

## 文件 (Docs)

### README.md

- [x] Roadmap Phase 6 邏輯矛盾：Windows 11 (x64) 被列為「規劃中 TODO」，但 Windows 是目前的**主要開發平台**，應改為 ✅ 並加備註說明
- [x] Wails badge URL 使用非標準角括號語法：`![Wails Version](<https://...>)`，改成標準 `![Wails Version](https://...)`

### docs/DEVELOPMENT.md

- [x] 第 35 行：Go 版本寫錯，`Go 1.21+` → `Go 1.25+`（與 `go.mod` 一致）
- [x] 第 62 行：新增 Renderer 的 switch-case 位置寫錯，說是在 `HudGrid.tsx` 的 `renderWidget`，實際上是在 `UniversalWidget.tsx` 的 `renderContent()`
- [x] 第 79 行：Build 指令錯誤，`wails3 task build:windows` → `task build`（或 `go build`）
- [x] 第 25 行：排版問題，`#核心服務` 少了空格，應為 `# 核心服務`

### docs/PROTOCOL.md

- [x] 第 113 行：`data` 欄位標記為「必填」，但實際程式碼（`api_service.go`）中 `req.Data` 可為 nil；只有 `module_id` 是必填

---

## 程式碼 — 前端 (Frontend)

### SettingsModal.tsx

- [x] 第 20 行：`console.log("[SettingsModal] init with currentConfig:", ...)` 是 debug 殘留，應改為 `debugLog` 或直接刪除
- [x] 第 57 行：`console.log("[SettingsModal] saving config:", ...)` 同上
- [x] 第 330 行：`console.error("[SettingsModal] RemoveSidecar failed:", err)` 應改為 `debugLog("ERR", "Settings", ...)`
- [x] UI 語言不一致：`"極簡模式"`、`"透明度"`、`"刪除此 Widget"`、`window.confirm("確定要刪除...")` 等中文字串夾雜在英文 UI 中，應統一為英文（或建立 i18n 機制）

### App.tsx

- [x] 第 400 行：`console.error("Failed to save layout config:", err)` 應改為 `debugLog("ERR", "Layout", ...)`
- [x] 第 337–338 行：同一行注解重複出現兩次
  ```tsx
  // Track layout changes — update window width based on content extent
  // Track layout changes — update window width based on content extent
  ```
- [x] `maxContentCols` 計算邏輯在 `loadConfig`、`handleSettingsClose`、save effect 三處重複，可抽成一個 utility function `calcMaxCols(widgets, origin)`
- [x] `import { DebugConsole, debugLog }` 在第 21 行（其他 import 之後），應移至 import 區塊頂部統一排列

### 死程式碼

- [x] `frontend/src/widgets/`：整個 legacy 資料夾（CpuWidget、DiskWidget 等）無任何 import，應刪除或移到 `_archive/`
  > ✅ 已在先前的 Phase 2 清理中刪除，資料夾已不存在

---

## 程式碼 — 後端 (Go)

### system_service.go

- [x] 第 431–433 行：`GetSystemStats()` 永遠回傳 `nil, nil`，是向後相容 stub，已無作用，應直接刪除
  ```go
  // GetSystemStats kept for backward compatibility.
  func (s *SystemService) GetSystemStats() (any, error) {
      return nil, nil
  }
  ```
- [x] 第 85、98、175、614 行：`fmt.Printf(...)` 日誌格式不統一（各自有不同 prefix 格式），建議全面換成 `log/slog` 結構化日誌（Go 1.21+ 標準庫）
- [x] 第 232 行：Sidecar TTL `10*time.Second` 硬寫，無法設定；考慮移為 AppConfig 欄位或常數
- [x] 第 146、174、612 行：`_ = s.configService.UpdateConfig(...)` / `_ = s.SaveConfig(...)` 靜默吞掉錯誤，至少應 log 一下

### config.go

- [x] 第 28 行：`AppConfig.Theme` 欄位設定預設值 `"neon"` 但前後端皆未使用，屬死欄位，應刪除
- [x] 第 30 行：`AppConfig.GridColumns` 欄位仍在結構體與 `withDefaults()` 中，但 App.tsx 已改為動態推算（`maxContentCols`），前後端已不同步；考慮移除或明確標記為廢棄

### api_service.go

- [x] 第 34 行：HTTP port `9090` 硬寫，若 port 被佔用無法調整；考慮從環境變數或 config 讀取

---

## 架構 / 維護

- [x] 無 CI/CD：沒有 GitHub Actions workflow；建議加一個最基本的 build check（`go build ./...` + `npm run build`）防止 PR 破壞建置
- [x] 無 CHANGELOG.md：專案已到 v0.4.0，建議建立 CHANGELOG 記錄各版本變動

---

_最後更新：審查日期 2026-02-18_
