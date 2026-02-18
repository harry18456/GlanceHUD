# Widget 設定與 Offline 機制說明

本文件說明 GlanceHUD 目前支援的 Widget 類型、可設定參數以及 Offline 機制的運作方式。

## 1. Widget 類型與參數對照表

目前系統支援五種 Widget 類型，每種支援的 `props` 不同。
`props.color` 在所有 renderer 均已支援：設定後使用指定顏色，未設定則維持自動配色行為。

### 1.1 TextRenderer (`type: "text"`)

適用於顯示單一數值或簡單資訊。

| 屬性來源   | 參數名稱      | 狀態    | 說明                                                          |
| :--------- | :------------ | :------ | :------------------------------------------------------------ |
| **Config** | `title`       | ✅ 支援 | 顯示於左上角的標題。                                          |
| **Config** | `props.color` | ✅ 支援 | 數值文字顏色。未設定時使用 `var(--text-primary)`。            |
| **Config** | `props.unit`  | ✅ 支援 | 數值後綴單位（如 `"°C"`）。僅對數字 `value` 有效，有動畫效果。|
| **Data**   | `value`       | ✅ 支援 | 主要數值 (右上角)，若為數字會有動畫效果。                     |
| **Data**   | `label`       | ✅ 支援 | 若提供，會覆蓋 `title`。                                      |
| **Data**   | `items`       | ✅ 支援 | 顯示額外的 Key-Value 列表於下方 (雙欄)。                      |

### 1.2 KVRenderer (`type: "key-value"`)

適用於多欄位資訊顯示 (例如：Weather)。

| 屬性來源   | 參數名稱       | 狀態    | 說明                                                                     |
| :--------- | :------------- | :------ | :----------------------------------------------------------------------- |
| **Config** | `title`        | ✅ 支援 | 左上角標題。                                                             |
| **Config** | `props.layout` | ✅ 支援 | 設定為 `"row"` 可切換為水平排列 (預設垂直)。                             |
| **Config** | `props.color`  | ✅ 支援 | Icon 顏色。未設定時使用 `var(--color-info)`。                            |
| **Data**   | `items`        | ✅ 支援 | 包含多個 `{ key, value, icon }` 的列表。                                 |
| **Data**   | `items[].icon` | ✅ 支援 | 使用 kebab-case 名稱，詳見下方「可用 Icon 清單」。                        |

### 1.3 BarListRenderer (`type: "bar-list"`)

適用於 Top Processes 或 Disk Usage。

| 屬性來源   | 參數名稱      | 狀態    | 說明                                                                   |
| :--------- | :------------ | :------ | :--------------------------------------------------------------------- |
| **Config** | `title`       | ✅ 支援 | 左上角標題。                                                           |
| **Config** | `props.color` | ✅ 支援 | 所有進度條的固定顏色。未設定時根據各項 `percent` 自動配色（綠/黃/紅）。|
| **Data**   | `items`       | ✅ 支援 | 包含 `{ label, value, percent }` 的列表。                              |

### 1.4 GaugeRenderer (`type: "gauge"`)

適用於 CPU / GPU / Memory Loading。

| 屬性來源   | 參數名稱      | 狀態    | 說明                                                                   |
| :--------- | :------------ | :------ | :--------------------------------------------------------------------- |
| **Config** | `title`       | ✅ 支援 | 顯示於圓環右側上方。                                                   |
| **Config** | `props.unit`  | ✅ 支援 | 顯示於數值後方 (預設 `%`)。                                            |
| **Config** | `props.color` | ✅ 支援 | 圓環顏色。未設定時根據 `value` 自動配色（綠/黃/紅）。                  |
| **Data**   | `value`       | ✅ 支援 | 數值，決定圓環進度；自動配色模式下同時決定顏色。                       |

### 1.5 SparklineRenderer (`type: "sparkline"`)

適用於顯示數值隨時間的變化趨勢（迷你折線圖）。

| 屬性來源   | 參數名稱           | 狀態    | 說明                                                                 |
| :--------- | :----------------- | :------ | :------------------------------------------------------------------- |
| **Config** | `title`            | ✅ 支援 | 左上角標題。                                                         |
| **Config** | `props.unit`       | ✅ 支援 | 顯示於數值後方（如 `"%"`、`"°C"`）。                                 |
| **Config** | `props.color`      | ✅ 支援 | 折線與填充顏色。未設定時根據最新值自動配色（綠/黃/紅）。             |
| **Config** | `props.maxPoints`  | ✅ 支援 | 保留的歷史資料點數量（預設 `30`）。前端滾動緩衝，重啟後重新收集。   |
| **Data**   | `value`            | ✅ 支援 | 最新數值（數字），會自動加入歷史 buffer 並以動畫顯示於右上角。       |

> **注意**：歷史資料由前端在記憶體中累積。若 Widget 因設定變更而重新載入，歷史會從頭開始收集。

### 1.6 可用 Icon 清單

`items[].icon` 欄位支援以下名稱（kebab-case 或 PascalCase 皆可，例如 `"cloud-rain"` 與 `"CloudRain"` 等效）：

| 分類 | 可用名稱 |
| :--- | :--- |
| **硬體 / 系統** | `cpu`, `memory-stick`, `hard-drive`, `server`, `database`, `monitor`, `laptop`, `battery`, `battery-charging` |
| **網路** | `arrow-up`, `arrow-down`, `arrow-up-down`, `wifi`, `wifi-off`, `globe`, `network`, `signal` |
| **天氣 / 環境** | `sun`, `cloud`, `cloud-rain`, `cloud-snow`, `wind`, `droplets`, `thermometer`, `snowflake`, `zap` |
| **狀態 / 警示** | `activity`, `alert-triangle`, `alert-circle`, `check-circle`, `x-circle`, `info`, `bell` |
| **時間** | `clock`, `timer`, `calendar` |
| **開發 / 流程** | `terminal`, `code`, `package`, `git-branch`, `layers` |
| **指標** | `trending-up`, `trending-down`, `bar-chart-2`, `gauge` |
| **其他** | `volume-2`, `volume-x`, `star`, `heart`, `home`, `music` |

---

## 2. Widget 來源類型差異 (Native vs Sidecar)

GlanceHUD 中的 Widget 依據資料來源分為兩種類型，其行為與機制有顯著差異：

| 特性                    | **Native Widgets** (內建)                        | **Sidecar Widgets** (外掛)                                             |
| :---------------------- | :----------------------------------------------- | :--------------------------------------------------------------------- |
| **例子**                | CPU, Memory, Disk, Net                           | Python 腳本, Node.js 服務, 第三方工具                                  |
| **資料來源**            | 直接由 GlanceHUD 主程式 (Backend) 讀取系統資訊。 | 由外部程式透過 HTTP API 推送給 GlanceHUD。                             |
| **啟動方式**            | 隨主程式啟動，始終存在。                         | **Lazy Load (懶加載)**：只有當外部程式開始運作並推送資料時，才會顯示。 |
| **Offline 機制**        | **不適用** (始終 Online)。                       | **適用**：若超過 10 秒未收到資料，會標記為 Offline。                   |
| **設定檔 (Config)**     | 預設存在於 `config.json` 中。                    | 第一次連線時會自動寫入 `config.json`，之後保留設定。                   |
| **Settings UI (Schema)** | 由 Go 程式碼定義 (`GetConfigSchema()`)。        | 可透過 `SidecarRequest.schema` 欄位動態提供，在 Settings 中顯示設定表單。使用者修改後，下次推送的 Response `props` 會帶回新值。 |

## 3. Sidecar 的運作機制 (Lazy Load)

### 3.1 懶加載 (Lazy Loading)

Sidecar Widgets **不會** 在 GlanceHUD 啟動時自動出現，即使 `config.json` 中已經有該 Widget 的設定。

- **觸發條件**：必須等待 Sidecar 程式 (如 `python-sidecar.py`) 啟動並發送第一次資料。
- **顯示流程**：
  1.  Sidecar發送 HTTP POST 到 `http://localhost:9090/api/widget`。
  2.  GlanceHUD Backend 接收到資料，確認該 ID 是否已註冊。
  3.  Backend 通知前端重新整理列表。
  4.  Widget 出現在畫面上。

### 3.2 位置記憶 (Position Persistence)

雖然是懶加載，但 Widget 的位置與設定 **會被記憶**。

- **儲存方式**：位置 (`x`, `y`, `w`, `h`) 與參數 (`props`) 儲存在 `config.json` 中。
- **行為**：
  - Sidecar 每次連線時，Backend 會檢查 `config.json`。
  - 若該 ID 已存在，則 **沿用上次紀錄的位置與設定**。
  - 因此，只要不手動刪除設定檔，Sidecar 每次重新啟動都會出現在上次離開的位置。

---

## 4. Offline 機制說明

### 4.1 適用範圍

Offline 機制 **僅適用於 Sidecar Widgets** (透過 `http://localhost:9090/api/widget` 推送資料的模組)。
內建的 Native Widgets (CPU, Memory, Disk, Net) 不受此機制影響。

### 4.2 觸發條件

- **判定方式**：Backend 會檢查每個 Sidecar 最後一次成功推送資料的時間 (`LastSeen`)。
- **Timeout 時間**：固定為 **10 秒** (Hardcoded)。
- **行為**：若超過 10 秒未收到資料，該 Widget 會被標記為 `Offline`。
  - 前端收到更新後，Widget 會變為灰階並降低透明度，標題列顯示「Offline」標籤。
  - 一旦 Sidecar 重新推送資料，狀態會立即恢復為 Online。

### 4.3 設定限制

目前 Offline 機制無法透過 `config.json` 進行設定：

- ❌ 無法調整 Timeout 時間。
- ❌ 無法關閉 Offline 檢查。
