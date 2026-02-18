# API 規格與伺服器設定

GlanceHUD 內建一個輕量級的 HTTP Server，用於接收外部程式 (Sidecar) 推送的數據。

## 1. 伺服器設定 (Server Configuration)

目前的伺服器設定為 **Hardcoded (寫死)**，尚不支援透過設定檔修改。

| 項目          | 設定值                  | 說明                                              |
| :------------ | :---------------------- | :------------------------------------------------ |
| **通訊協定**  | HTTP                    | 僅支援 HTTP，無 HTTPS。                           |
| **監聽 Port** | `9090`                  | 固定使用 Port 9090。                              |
| **綁定介面**  | `127.0.0.1` (Localhost) | 僅監聽本機迴路介面，區域網路內的其他裝置無法存取。 |
| **CORS**      | 未特別處理              | 僅供本機 (`localhost`) 使用。                     |

---

## 2. API 端點 (Endpoints)

### 2.1 推送 Widget 數據

用於 Sidecar 註冊與推送數據更新。這是目前唯一運作中的 API。

- **URL**: `POST /api/widget`
- **Content-Type**: `application/json`

#### 請求格式 (Request Body)

```json
{
  "module_id": "python.example.gpu",
  "template": {
    "type": "gauge",
    "title": "GPU Load",
    "props": {
      "unit": "%"
    }
  },
  "schema": [
    { "name": "gpu_index", "label": "GPU Index", "type": "number", "default": 0 }
  ],
  "data": {
    "value": 45,
    "label": "GPU",
    "items": [
      { "key": "Temp", "value": "65°C" },
      { "key": "Fan", "value": "1200 RPM" }
    ]
  }
}
```

- **欄位說明**:
  - `module_id` (Required): Widget 的唯一識別碼。建議使用 `namespace.name` 格式。
  - `template` (Optional): 第一次註冊時使用的設定模板。若 ID 已存在，則忽略。
  - `schema` (Optional): Settings UI 的設定表單 Schema。格式與 Native Module 的 `ConfigSchema` 相同。可隨 `template` 一同提供，或在後續推送時更新。
  - `data` (Optional): 實際推送的數據內容。

#### 回應 (Response)

- **200 OK**：回傳 `SidecarResponse`，包含目前使用者在 Settings 中設定的值：
  ```json
  {
    "status": "ok",
    "props": {
      "gpu_index": 0,
      "minimal_mode": false
    }
  }
  ```
  `props` 欄位可能為空（`null` 或省略），例如首次推送尚未 Apply Config 時。Sidecar 可讀取此回傳值以取得使用者設定。
- **400 Bad Request**: JSON 格式錯誤或缺少 `module_id`。
- **405 Method Not Allowed**: 使用了非 POST 方法。

---

### 2.2 獲取統計資訊

返回當前所有 Widget 的資料快照，適合 Home Assistant、Stream Deck、或任何需要「讀取」而非「推送」的外部整合。

- **URL**: `GET /api/stats`
- **Query Params**: `id` (Optional) — 過濾特定 Widget 的 Render ID (e.g. `?id=glancehud.core.cpu`)

#### 回應格式 (Response Body)

```json
{
  "widgets": {
    "glancehud.core.cpu": {
      "id": "glancehud.core.cpu",
      "type": "sparkline",
      "title": "CPU",
      "data": { "value": 42.1 }
    },
    "glancehud.core.mem": {
      "id": "glancehud.core.mem",
      "type": "gauge",
      "title": "Memory",
      "data": { "value": 67.3 }
    },
    "gpu.0": {
      "id": "gpu.0",
      "type": "sparkline",
      "title": "RTX 4090 Core",
      "data": { "value": 88.0 },
      "is_offline": false
    }
  }
}
```

- **欄位說明**:
  - `widgets` (Object): 以 Widget Render ID 為 Key 的快照 Map。
  - `data` (Object | null): 最後一次收到的 `DataPayload`。尚未收到任何資料時為 `null`。
  - `is_offline` (Boolean, 省略表示 false): 僅出現在 Sidecar Widget。`true` 表示超過 10 秒未收到推送。

- **回應碼**:
  - **200 OK**: 永遠回傳，即使沒有任何 Widget（返回空 `widgets: {}`）。
  - **405 Method Not Allowed**: 使用了非 GET 方法。

#### 使用範例

```bash
# 取得所有 Widget 快照
curl http://localhost:9090/api/stats

# 只取 CPU 資料
curl "http://localhost:9090/api/stats?id=glancehud.core.cpu"
```
