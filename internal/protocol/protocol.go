package protocol

// ==========================================
// 1. 顯示協議 (Display Protocol)
// ==========================================

// ComponentType 定義所有支援的組件類型
type ComponentType string

const (
	TypeGauge    ComponentType = "gauge"
	TypeBarList  ComponentType = "bar-list"
	TypeKeyValue ComponentType = "key-value"
	TypeGroup    ComponentType = "group"
	TypeSpark    ComponentType = "sparkline"
)

// RenderConfig 對應 GetRenderConfig() 的回傳結構
type RenderConfig struct {
	ID    string         `json:"id"`    // e.g., "glancehud.core.cpu"
	Type  ComponentType  `json:"type"`  // e.g., "gauge"
	Title string         `json:"title"` // e.g., "CPU Use"
	Props map[string]any `json:"props"` // 靜態設定 (min, max, unit...)
}

// DataPayload 對應 WebSocket 推送或 HTTP Response
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

// UpdateEvent 用於 WebSocket 推送 (包含 ID)
type UpdateEvent struct {
	ID   string       `json:"id"`
	Data *DataPayload `json:"data"`
}

// --- 組件專用數據結構 (Helper Structs) ---

// BarListItem 用於 BarList
type BarListItem struct {
	Label   string  `json:"label"`
	Percent float64 `json:"percent"`
	Value   string  `json:"value"` // e.g. "100GB / 500GB"
}

// KeyValueItem 用於 KeyValue List
type KeyValueItem struct {
	Key   string `json:"key"`
	Value string `json:"value"`
	Icon  string `json:"icon,omitempty"`
}

// ==========================================
// 2. 設定協議 (Config Protocol)
// ==========================================

type ConfigType string

const (
	ConfigText       ConfigType = "text"
	ConfigNumber     ConfigType = "number"
	ConfigBool       ConfigType = "bool"
	ConfigSelect     ConfigType = "select"
	ConfigCheckboxes ConfigType = "checkboxes"
	ConfigButton     ConfigType = "button"
)

// ConfigSchema 定義單個設定欄位
type ConfigSchema struct {
	Name    string         `json:"name,omitempty"` // Action 按鈕可能不需要 name
	Label   string         `json:"label"`
	Type    ConfigType     `json:"type"`
	Default any            `json:"default,omitempty"`
	Options []SelectOption `json:"options,omitempty"` // 僅用於 select
	Action  string         `json:"action,omitempty"`  // 僅用於 button
}

type SelectOption struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

// ==========================================
// 3. API / Sidecar 協議
// ==========================================

// SidecarRequest 對應 POST /api/widget 的 Body
type SidecarRequest struct {
	ModuleID string         `json:"module_id"`
	Template *RenderConfig  `json:"template,omitempty"` // 第一次註冊時必填
	Schema   []ConfigSchema `json:"schema,omitempty"`   // 可選：settings 表單 schema
	Data     *DataPayload   `json:"data"`               // 更新數據
}

// SidecarResponse 對應 POST /api/widget 的 Response
// Props 包含使用者在 Settings 中設定的值，供 sidecar 讀回
type SidecarResponse struct {
	Status string         `json:"status"`
	Props  map[string]any `json:"props,omitempty"`
}

// StatEntry 是單一 widget 的當前狀態快照，用於 GET /api/stats
type StatEntry struct {
	ID        string        `json:"id"`
	Type      ComponentType `json:"type"`
	Title     string        `json:"title"`
	Data      *DataPayload  `json:"data"`
	IsOffline bool          `json:"is_offline,omitempty"`
}

// StatsResponse 是 GET /api/stats 的回應結構
type StatsResponse struct {
	Widgets map[string]StatEntry `json:"widgets"`
}
