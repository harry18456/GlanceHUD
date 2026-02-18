# API 規格與伺服器設定

GlanceHUD 內建一個輕量級的 HTTP Server，用於接收外部程式 (Sidecar) 推送的數據。

## 1. 伺服器設定 (Server Configuration)

目前的伺服器設定為 **Hardcoded (寫死)**，尚不支援透過設定檔修改。

| 項目          | 設定值                     | 說明                                                                                  |
| :------------ | :------------------------- | :------------------------------------------------------------------------------------ |
| **通訊協定**  | HTTP                       | 僅支援 HTTP，無 HTTPS。                                                               |
| **監聽 Port** | `9090`                     | 固定使用 Port 9090。                                                                  |
| **綁定介面**  | `0.0.0.0` (All Interfaces) | 預設綁定所有網路介面，這意味著區域網路內的裝置若未被防火牆阻擋，可能可以訪問此 API。  |
| **CORS**      | 未特別處理                 | 目前主要供本機 (`localhost`) 使用，但因綁定 `0.0.0.0`，外部請求在網路層面上是可達的。 |

> **⚠️ 安全注意**：由於綁定 `0.0.0.0` 且未實作驗證機制，建議在生產環境或公共網路中使用防火牆 (Firewall) 阻擋外部對 Port 9090 的連線，僅允許 `localhost` 存取。

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
    "type": "text",
    "title": "GPU Load",
    "props": {
      "unit": "%"
    }
  },
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
  - `module_id` (Required): Widget 的唯一識別碼。
  - `template` (Optional): 第一次註冊時使用的設定模板。若 ID 已存在 `config.json`，則此欄位會被忽略。
  - `data` (Optional): 實際推送的數據內容。

#### 回應 (Response)

- **200 OK**:
  ```json
  { "status": "ok" }
  ```
- **400 Bad Request**: JSON 格式錯誤或缺少 `module_id`。
- **405 Method Not Allowed**:使用了非 POST 方法。

---

### 2.2 獲取統計資訊 (未實作)

預計用於獲取當前所有模組的狀態快照。

- **URL**: `GET /api/stats`
- **狀態**: `501 Not Implemented` (尚未實作)
