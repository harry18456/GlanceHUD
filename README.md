# GlanceHUD (v3)

**GlanceHUD** 是一個輕量級、無邊框、半透明的 Windows 桌面懸浮監控儀表板。專為需要隨時掌握系統狀態（CPU、記憶體、硬碟、網路）但不想被複雜介面干擾的使用者設計。

基於 **Wails v3 (Alpha)**、**React** 與 **Tailwind CSS** 構建。

![Screenshot](screenshot.png) <!-- 你之後可以補上截圖 -->

## ✨ 主要功能

- **極簡設計**: 無邊框、背景透明、磨砂玻璃質感 (Backdrop Blur)。
- **總是置頂**: 不會被其他視窗遮擋，適合放在副螢幕或角落。
- **模組化架構**: 資訊卡片（Widgets）各自獨立，易於擴充。
- **自訂設定**:
  - **開關模組**: 點擊設定圖示 (⚙️) 即可勾選要顯示的資訊。
  - **拖曳排序**: 在設定選單中拖曳調整顯示順序。
  - **即時生效**: 所有變更都會自動儲存 (Config Persistence)。
- **目前支援模組**:
  - 🚀 **Processor (CPU)**: 即時負載百分比。
  - 🧠 **Memory (RAM)**: 使用率與剩餘容量。
  - 💾 **Disk (C:)**: 系統碟空間監控。
  - 🌐 **Network**: 即時上傳/下載速度。

## 📊 模組實作細節 (Implementation Details)

GlanceHUD 使用 Go 的 [gopsutil](https://github.com/shirou/gopsutil) 庫來獲取跨平台的系統資訊。

| 模組 (Module) | 資訊內容 (Metrics)                   | 實作方式 / 函式庫 (Library)                           |
| :------------ | :----------------------------------- | :---------------------------------------------------- |
| **Processor** | CPU 總使用率 (%)                     | `cpu.Percent(0, false)`                               |
| **Memory**    | RAM 使用率 (%) <br> 使用量/總量 (GB) | `mem.VirtualMemory()`                                 |
| **Disk**      | 磁碟使用率 (%) <br> 使用量/總量 (GB) | `disk.Usage("C:\\")`                                  |
| **Network**   | 上傳/下載速度 (KB/s)                 | `net.IOCounters(false)` <br> _(計算兩次採樣的時間差)_ |
| **Config**    | 設定檔讀寫 (JSON)                    | `encoding/json`, `os.ReadFile`                        |
| **Frontend**  | UI 渲染與動畫                        | React, Tailwind CSS, Framer Motion                    |

## 🛠️ 開發與安裝

### 前置需求

- Go 1.25+
- Node.js 18+
- [Wails v3 CLI](https://v3.wails.io/installation) (`go install github.com/wailsapp/wails/v3/cmd/wails3@latest`)
- [Task](https://taskfile.dev/) (`go install github.com/go-task/task/v3/cmd/task@latest`)

### 啟動開發環境

```bash
# 在專案根目錄
cd GlanceHUD

# 啟動後端與前端 (支援 HMR)
wails3 dev
```

### 建置發布 (Windows)

```bash
task windows:build
# 產出的執行檔位於 bin/GlanceHUD.exe
```

## 🧩 如何新增資訊模組 (How to add a new module)

GlanceHUD 採用模組化設計，新增一個資訊卡片只需要 3 個步驟：

### 1. Backend: 實作 Module 介面

在 `internal/modules/` 新增一個 `.go` 檔案（例如 `uptime.go`），並實作 `Module` 介面：

```go
package modules

type UptimeModule struct{}

func NewUptimeModule() *UptimeModule {
    return &UptimeModule{}
}

func (m *UptimeModule) ID() string {
    return "uptime" // 獨一無二的 ID
}

func (m *UptimeModule) Update() (*ModuleData, error) {
    // 獲取數據的邏輯...
    return &ModuleData{
        ID:    m.ID(),
        Label: "System Uptime",
        Value: "5 days 2 hours", // 可以是任何類型
        Icon:  "Clock",          // Lucide Icon 名稱
    }, nil
}
```

### 2. Backend: 註冊模組

在 `systemservice.go` 的 `NewSystemService` 中註冊新模組：

```go
return &SystemService{
    // ...
    modules: map[string]modules.Module{
        "cpu":    modules.NewCPUModule(),
        // ...
        "uptime": modules.NewUptimeModule(), // 新增這行
    },
}
```

### 3. Frontend: 建立 React 元件

1.  在 `frontend/src/widgets/` 建立 `UptimeWidget.tsx`：

    ```tsx
    import { Clock } from "lucide-react";
    import { StatCard } from "../components/StatCard";

    export function UptimeWidget({ data }: { data: any }) {
      return (
        <StatCard
          icon={Clock}
          label="Uptime"
          value={0} // 這裡可以根據 data.value 顯示
          sub={data.value} // 顯示文字
        />
      );
    }
    ```

2.  在 `frontend/src/WidgetRegistry.ts` 中註冊：

    ```typescript
    import { UptimeWidget } from "./widgets/UptimeWidget";

    export const WIDGET_REGISTRY = {
      // ...
      uptime: UptimeWidget,
    };
    ```

完成！重啟程式後，你就可以在設定選單中看到並開啟新的模組了。

## 📜 License

MIT
