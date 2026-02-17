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

定義於 `internal/protocol/protocol.go`:

#### A. `gauge` (環形進度條)

- **Props**: `min`, `max`, `unit`, `color`
- **Data**: `value` (number), `label` (string)

#### B. `bar-list` (長條圖列表)

- **Props**: `headers` (string[])
- **Data**: `items` ([]BarListItem)
  ```go
  type BarListItem struct {
  	Label   string  `json:"label"`
  	Percent float64 `json:"percent"`
  	Value   string  `json:"value"`
  }
  ```

#### C. `key-value` (鍵值對列表)

- **Props**: `layout` ("row" | "column")
- **Data**: `items` ([]KeyValueItem)
  ```go
  type KeyValueItem struct {
  	Key   string `json:"key"`
  	Value string `json:"value"`
  	Icon  string `json:"icon,omitempty"`
  }
  ```

#### D. `group` (容器)

- **Props**: `layout` ("horizontal" | "vertical"), `gap`, `align`, `children`

#### E. `sparkline` (迷你趨勢圖)

- **Props**: `lineColor`, `fillColor`, `maxDataPoints`
- **Data**: `value` (number, push 1 point), `displayValue` (string)

---

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
  "data": {
    "value": 78,
    "label": "78°C"
  }
}
```

- **`module_id`** (必填): 唯一識別碼，建議使用 `namespace.name` 格式。
- **`template`** (選填):
  - 若 HUD 尚未有此 ID 的記錄，則使用此 Template 建立新 Widget。
  - 若 HUD 已有此 ID，則忽略 Template (或可選擇更新)。
  - **建議**: 外部腳本可在每次啟動時的**第一次**推送帶上 Template，後續推送可省略。
- **`data`** (必填): 要更新的數據 payload。

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

# 第一次推送: 包含 Template
first_payload = {
    "module_id": ID,
    "template": {
        "type": "gauge",
        "title": "Python CPU",
        "props": {"unit": "%", "color": "text-blue-500"}
    },
    "data": { "value": 0 }
}
requests.post(URL, json=first_payload)

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
        requests.post(URL, json=payload)
        print(f"Pushed: {cpu}%")
    except:
        print("HUD not running?")

    time.sleep(2) # 每 2 秒推送一次 (滿足 < 10s TTL)
```
