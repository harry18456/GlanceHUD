# GlanceHUD V2 Protocol Specification

此文件定義 GlanceHUD V2 的前後端通訊協議，包含顯示 (Display)、設定 (Config) 與擴充 (Sidecar) 三部分。
核心原則：**Backend-Driven UI**。前端僅負責渲染標準組件，不含業務邏輯。

---

## 1. 顯示協議 (Display Protocol)

### 1.1 基本結構 (Base Structure)

每個模組 (Module) 透過 `GetRenderConfig()` 回傳其顯示樣板設定。

```go
type RenderConfig struct {
	ID    string         `json:"id"`    // e.g., "glancehud.core.cpu"
	Type  ComponentType  `json:"type"`  // e.g., "gauge"
	Title string         `json:"title"` // e.g., "CPU Use"
	Props map[string]any `json:"props"` // 靜態設定 (min, max, unit...)
}
```

**Dynamic Prop Override (動態屬性覆蓋)**:
`DataPayload` 中可包含 `props` 欄位，用於覆蓋靜態設定 (例如：數值過高時變色)。

```go
type DataPayload struct {
	// 通用數值
	Value        any    `json:"value,omitempty"`        // 支援 number 或 string
	Label        string `json:"label,omitempty"`        // Gauge 中心文字
	DisplayValue string `json:"displayValue,omitempty"` // Sparkline 旁顯示文字

	// 列表類數據 (BarList, KeyValue)
	Items any `json:"items,omitempty"` // []BarItem 或 []KeyValueItem

	// 動態屬性覆蓋 (重點功能)
	Props map[string]any `json:"props,omitempty"`
}
```

### 1.2 組件類型定義 (Component Types)

詳細的 Front-end Renderer 行為、支援屬性 (Props) 與數據格式 (Data) 請參閱 [WIDGET.md](./WIDGET.md)。

`PROTOCOL.md` 僅定義底層傳輸的通用結構，具體的渲染邏輯 (如 Gauge 顏色計算、BarList 排列方式) 由前端實作決定。

## 2. 設定協議 (Config Protocol)

模組透過 `GetConfigSchema()` 回傳設定表單結構。

```go
type ConfigSchema struct {
	Name    string         `json:"name,omitempty"`
	Label   string         `json:"label"`
	Type    ConfigType     `json:"type"`
	Default any            `json:"default,omitempty"`
	Options []SelectOption `json:"options,omitempty"` // 僅用於 select
	Action  string         `json:"action,omitempty"`  // 僅用於 button
}
```

### Config Types

- `text`: 文字輸入
- `number`: 數字輸入
- `bool`: 開關
- `select`: 下拉選單 (需提供 `options`)
- `checkboxes`: 多選 (需提供 `options`)
- `button`: 觸發動作 (需提供 `action` method name)

---

## 3. Sidecar 擴充協議 (Sidecar Protocol)

這是 Phase 4 的核心功能，允許外部程式 (Python, Node.js, Shell) 透過 HTTP 將數據推送到 GlanceHUD。

### 3.1 Lazy Registration (懶載入/隨附註冊)

GlanceHUD 採用 **Lazy Registration** 模式。外部程式不需要先呼叫獨立的註冊 API，而是直接將 `Template` (設定) 包含在第一次的 `Data` 推送中。

- **URL**: `POST http://localhost:9090/api/widget`
- **Method**: `POST`
- **Content-Type**: `application/json`

**Request Body (`SidecarRequest`)**:

```json
{
  "module_id": "my-python-script.gpu",
  "template": {
    "type": "gauge",
    "title": "NVIDIA GPU",
    "props": { "unit": "%", "max": 100 }
  },
  "schema": [
    { "name": "gpu_index", "label": "GPU Index", "type": "number", "default": 0 },
    { "name": "unit",      "label": "Unit",      "type": "select", "default": "celsius",
      "options": [{ "label": "°C", "value": "celsius" }, { "label": "°F", "value": "fahrenheit" }] }
  ],
  "data": {
    "value": 78,
    "label": "78°C"
  }
}
```

- **`module_id`** (必填): 唯一識別碼，建議使用 `namespace.name` 格式。
- **`template`** (選填):
  - 若 HUD 尚未有此 ID 的記錄，則使用此 Template 建立新 Widget。
  - 若 HUD 已有此 ID，則忽略 Template。
  - **建議**: 外部腳本可在每次啟動時的**第一次**推送帶上 Template，後續推送可省略。
- **`schema`** (選填): Settings UI 的設定表單 Schema，格式與 `ConfigSchema` 相同 (詳見 Section 2)。可讓使用者在 GlanceHUD Settings 中調整 Sidecar 的參數。
- **`data`** (必填): 要更新的數據 payload。

**Response Body (`SidecarResponse`)**:

```json
{
  "status": "ok",
  "props": {
    "gpu_index": 0,
    "unit": "celsius",
    "minimal_mode": false
  }
}
```

GlanceHUD 在每次收到 POST 後，都會於 Response 回傳目前使用者在 Settings 中設定的 `props`（合併了 `schema` 預設值與使用者修改的值，以及全域的 `minimal_mode`）。Sidecar 可讀取此回傳值，以便根據使用者偏好調整資料格式或顯示內容。首次推送後 `props` 可能為空，建議下次推送時再次讀取。

---

### 3.2 離線機制 (Offline Mechanism)

為了避免外部腳本掛掉後 HUD 仍顯示舊數據，Sidecar 協議包含 **Offline** 偵測機制。

1.  **TTL (Time To Live)**:
    - 每個 Sidecar Widget 預設有 **10 秒** 的 TTL。
2.  **Heartbeat (心跳)**:
    - Sidecar 必須至少每 **5 秒** 推送一次數據 (即使數據未變更，也需發送 Payload 以維持在線狀態)。
3.  **Offline 狀態**:
    - 若 HUD 在 **10 秒** 內未收到該 ID 的任何推送，會自動將該 Widget 標記為 **Offline**。
    - **UI 表現**:
      - Widget 變灰 (Grayscale)。
      - 顯示斷線圖示或 "Offline" 標籤。
      - 數值保留最後一次的已知值，或顯示為 "--"。

4.  **恢復 (Recovery)**:
    - 當 Sidecar 重新發送請求時，Widget 立即恢復為 **Online** 狀態。

---

### 3.3 範例 (Python Sidecar)

```python
import requests
import time
import psutil

URL = "http://localhost:9090/api/widget"
ID = "python.cpu.monitor"

# 第一次推送: 包含 Template 與 Schema
first_payload = {
    "module_id": ID,
    "template": {
        "type": "gauge",
        "title": "Python CPU",
        "props": {"unit": "%"}
    },
    "schema": [
        {"name": "alert_threshold", "label": "Alert Threshold (%)", "type": "number", "default": 80}
    ],
    "data": {"value": 0}
}
resp = requests.post(URL, json=first_payload).json()
# 讀取使用者設定 (首次可能為空)
user_props = resp.get("props") or {}
alert_threshold = user_props.get("alert_threshold", 80)

while True:
    cpu = psutil.cpu_percent()

    # 後續推送: 只帶 Data
    payload = {
        "module_id": ID,
        "data": {
            "value": cpu,
            "label": f"{cpu}%"
        }
    }

    try:
        resp = requests.post(URL, json=payload).json()
        # 每次推送後讀取最新使用者設定
        user_props = resp.get("props") or {}
        alert_threshold = user_props.get("alert_threshold", 80)
        print(f"Pushed: {cpu}% (alert at {alert_threshold}%)")
    except Exception:
        print("HUD not running?")

    time.sleep(2)  # 每 2 秒推送一次 (滿足 < 10s TTL)
```
