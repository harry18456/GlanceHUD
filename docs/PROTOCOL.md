# GlanceHUD V2 Protocol Specification (Draft)

此文件定義 GlanceHUD V2 的前後端通訊協議，包含顯示 (Display) 與設定 (Config) 兩部分。
核心原則：**Backend-Driven UI**。前端僅負責渲染標準組件，不含業務邏輯。

---

## 1. 顯示協議 (Display Protocol)

### 1.1 基本結構 (Base Structure)

每個模組 (Module) 透過 `GetRenderConfig()` 回傳其顯示樣板設定。

```json
{
  "id": "glancehud.core.cpu", // 模組唯一 ID (namespace.module_name)
  "type": "gauge", // 組件類型
  "title": "CPU Use",
  "props": {
    // 靜態設定 (Default)
    "unit": "%",
    "color": "#00ff00"
  }
}
```

**Dynamic Prop Override (動態屬性覆蓋)**:
Data Payload 中可包含 `props` 欄位，用於覆蓋靜態設定 (例如：數值過高時變色)。

```json
{
  "value": 92,
  "label": "92%",
  "props": {
    "color": "#ff0000" // Alert color
  }
}
```

### 1.2 組件類型定義 (Component Types)

#### A. `gauge` (環形進度條)

- **用途**: CPU Usage, RAM Usage, Battery Level.
- **Props**:
  - `min` (number): 最小值 (預設 0)
  - `max` (number): 最大值 (預設 100)
  - `unit` (string): 單位 (e.g. "%", "°C")
  - `color` (string): 顏色代碼 (e.g. "text-green-500")
- **Data Payload (Update)**:
  ```json
  {
    "value": 45.2, // 當前數值
    "label": "45.2%" // (選填) 覆蓋中心顯示文字
  }
  ```

#### B. `bar-list` (長條圖列表)

- **用途**: Disk Usage (C:, D:), Top Processes.
- **Props**:
  - `headers` (string[]): ["Disk", "Used", "Free"] (選填)
- **Data Payload (Update)**:
  ```json
  {
    "items": [
      { "label": "C:", "percent": 45, "value": "100GB / 500GB" },
      { "label": "D:", "percent": 12, "value": "1.2TB / 2TB" }
    ]
  }
  ```

#### C. `key-value` (鍵值對列表)

- **用途**: Network Stats (Up/Down), System Info.
- **Props**:
  - `layout`: "row" | "column" (預設 column)
- **Data Payload (Update)**:
  ```json
  {
    "items": [
      { "key": "Upload", "value": "1.2 MB/s", "icon": "arrow-up" },
      { "key": "Download", "value": "4.5 MB/s", "icon": "arrow-down" }
    ]
  }
  ```

#### D. `group` (容器)

- **用途**: 組合多個子組件。
- **Props**:
  - `layout`: "horizontal" | "vertical" (預設 vertical)
  - `gap`: number (間距，預設 2)
  - `align`: "start" | "center" | "end" (對齊方式)
  - `children`: Array of Components (遞迴結構)

#### E. `sparkline` (迷你趨勢圖)

- **用途**: Network History, CPU Load History.
- **Props**:
  - `lineColor`: string (預設 #fff)
  - `fillColor`: string (選填, 區域填充色)
  - `maxDataPoints`: number (前端保留幾個點，例如 60)
- **Data Payload (Update)**:
  ```json
  {
    "value": 4500, // 新增的單點數值 (前端自動 push 到陣列並 shift 舊資料)
    "displayValue": "4.5 KB" // Tooltip 或旁邊顯示的文字
  }
  ```

#### F. `text` (純文字)

- **用途**: Minimalist Mode, Clock, IP Info.
- **Props**:
  - `size`: "sm" | "md" | "lg" (預設 "md")
  - `align`: "left" | "center" | "right" (預設 "left")
  - `color`: string (選填)
- **Data Payload (Update)**:
  ```json
  {
    "value": "15%", // 主要數值
    "label": "CPU", // (選填) 標題
    "sublabel": "2.4 GHz" // (選填) 副標題
  }
  ```

---

## 2. 設定協議 (Config Protocol)

模組透過 `GetConfigSchema()` 回傳設定表單結構。

#### A. 基本欄位 (Text, Number, Bool)

```json
{
  "name": "interval",
  "label": "更新頻率 (ms)",
  "type": "number",
  "default": 1000
}
```

#### B. 下拉選單 (Select)

```json
{
  "name": "net_interface",
  "label": "網路介面",
  "type": "select",
  "options": [
    { "label": "Wi-Fi", "value": "wlan0" },
    { "label": "Ethernet", "value": "eth0" }
  ],
  "default": "eth0"
}
```

#### C. 多選核取方塊 (Checkboxes)

```json
{
  "name": "paths",
  "label": "顯示磁碟",
  "type": "checkboxes",
  "options": [
    { "label": "C:\\", "value": "C:\\" },
    { "label": "D:\\", "value": "D:\\" }
  ],
  "default": ["C:\\", "D:\\"]
}
```

`default` 為字串陣列，表示預設勾選的項目。前端以 checkbox group 呈現，值存為 `string[]`。

#### D. 動作按鈕 (Action)

```json
{
  "type": "button",
  "label": "重描磁碟",
  "action": "rescan_disks" // 觸發後端對應的方法
}
```

前端 `SettingsModal` 將根據此陣列自動產生對應的 Input/Checkbox/Select 元件。

---

## 3. Sidecar 擴充協議 (Phase 4 預覽)

### 3.1 命名空間 (Namespacing)

強制 ID 格式為 `namespace.module_name`，避免衝突。

- `glancehud.core.cpu`
- `python.script.gpu`
- `community.plugin.weather`

### 3.2 心跳與斷線 (Heartbeat)

- **機制**: Sidecar 需定期發送數據 (建議每 5 秒至少一次)。
- **Offline**: 若後端超過 10 秒未收到數據，自動將該 Module 標記為 "Offline" (UI 變灰或顯示斷線圖示)。

### 3.3 數據注入 (Push)

外部腳本 (Python/Node) 可透過 HTTP POST `http://localhost:9090/api/widget` 推送數據。

**POST Body**:

```json
{
  "module_id": "gpu-monitor",
  "template": {
    // (選填) 第一次註冊時發送
    "type": "gauge",
    "title": "NVIDIA GPU",
    "props": { "unit": "%" }
  },
  "data": {
    // 更新數據
    "value": 78
  }
}
```
