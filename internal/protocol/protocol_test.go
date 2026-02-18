package protocol

import (
	"encoding/json"
	"testing"
)

// --- ComponentType constants ---

func TestComponentTypeValues(t *testing.T) {
	cases := []struct {
		ct   ComponentType
		want string
	}{
		{TypeGauge, "gauge"},
		{TypeBarList, "bar-list"},
		{TypeKeyValue, "key-value"},
		{TypeGroup, "group"},
		{TypeSpark, "sparkline"},
	}
	for _, tc := range cases {
		if string(tc.ct) != tc.want {
			t.Errorf("ComponentType %v: want %q, got %q", tc.ct, tc.want, string(tc.ct))
		}
	}
}

// --- RenderConfig serialization ---

func TestRenderConfig_JSONRoundTrip(t *testing.T) {
	rc := RenderConfig{
		ID:    "glancehud.core.cpu",
		Type:  TypeGauge,
		Title: "CPU",
		Props: map[string]any{"max": 100.0, "unit": "%"},
	}

	data, err := json.Marshal(rc)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded RenderConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.ID != rc.ID {
		t.Errorf("ID: want %q, got %q", rc.ID, decoded.ID)
	}
	if decoded.Type != rc.Type {
		t.Errorf("Type: want %q, got %q", rc.Type, decoded.Type)
	}
	if decoded.Title != rc.Title {
		t.Errorf("Title: want %q, got %q", rc.Title, decoded.Title)
	}
}

func TestRenderConfig_EmptyProps(t *testing.T) {
	rc := RenderConfig{ID: "test", Type: TypeKeyValue, Title: "T", Props: nil}
	data, err := json.Marshal(rc)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}
	var decoded RenderConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}
	// nil Props should round-trip as nil
	if decoded.Props != nil && len(decoded.Props) != 0 {
		t.Errorf("expected nil/empty Props, got %v", decoded.Props)
	}
}

// --- DataPayload serialization ---

func TestDataPayload_NumericValue(t *testing.T) {
	dp := DataPayload{Value: 42.5, Label: "42.5%"}
	data, err := json.Marshal(dp)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded DataPayload
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.Label != "42.5%" {
		t.Errorf("Label: want %q, got %q", "42.5%", decoded.Label)
	}
}

func TestDataPayload_OmitEmpty(t *testing.T) {
	dp := DataPayload{Value: 1.0}
	data, err := json.Marshal(dp)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	// Label, DisplayValue, Items, Props should be omitted
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"label", "displayValue", "items", "props"} {
		if _, ok := raw[field]; ok {
			t.Errorf("field %q should be omitted when empty", field)
		}
	}
}

func TestDataPayload_PropsOverride(t *testing.T) {
	dp := DataPayload{
		Value: 95.0,
		Props: map[string]any{"color": "#ef4444"},
	}
	data, _ := json.Marshal(dp)
	var decoded DataPayload
	_ = json.Unmarshal(data, &decoded)

	if decoded.Props == nil {
		t.Fatal("Props should not be nil")
	}
	if decoded.Props["color"] != "#ef4444" {
		t.Errorf("Props[color]: want '#ef4444', got %v", decoded.Props["color"])
	}
}

// --- UpdateEvent ---

func TestUpdateEvent_JSONRoundTrip(t *testing.T) {
	ue := UpdateEvent{
		ID:   "glancehud.core.mem",
		Data: &DataPayload{Value: 60.0, Label: "60%"},
	}
	data, err := json.Marshal(ue)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded UpdateEvent
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.ID != ue.ID {
		t.Errorf("ID: want %q, got %q", ue.ID, decoded.ID)
	}
	if decoded.Data == nil {
		t.Fatal("Data should not be nil")
	}
	if decoded.Data.Label != "60%" {
		t.Errorf("Data.Label: want '60%%', got %q", decoded.Data.Label)
	}
}

// --- BarListItem / KeyValueItem ---

func TestBarListItem_JSON(t *testing.T) {
	item := BarListItem{Label: "C:", Percent: 75.5, Value: "150GB / 200GB"}
	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded BarListItem
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.Percent != 75.5 {
		t.Errorf("Percent: want 75.5, got %v", decoded.Percent)
	}
	if decoded.Value != "150GB / 200GB" {
		t.Errorf("Value: want '150GB / 200GB', got %q", decoded.Value)
	}
}

func TestKeyValueItem_OmitEmptyIcon(t *testing.T) {
	item := KeyValueItem{Key: "Upload", Value: "1.2 MB/s"}
	data, err := json.Marshal(item)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var raw map[string]any
	_ = json.Unmarshal(data, &raw)
	if _, ok := raw["icon"]; ok {
		t.Error("icon field should be omitted when empty")
	}
}

// --- ConfigSchema ---

func TestConfigSchema_JSONRoundTrip(t *testing.T) {
	schema := ConfigSchema{
		Name:    "threshold",
		Label:   "Warning Threshold",
		Type:    ConfigNumber,
		Default: 80.0,
	}
	data, err := json.Marshal(schema)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded ConfigSchema
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.Name != "threshold" {
		t.Errorf("Name: want 'threshold', got %q", decoded.Name)
	}
	if decoded.Type != ConfigNumber {
		t.Errorf("Type: want %q, got %q", ConfigNumber, decoded.Type)
	}
}

func TestConfigSchema_SelectOptions(t *testing.T) {
	schema := ConfigSchema{
		Name: "interval",
		Type: ConfigSelect,
		Options: []SelectOption{
			{Label: "1s", Value: "1"},
			{Label: "5s", Value: "5"},
		},
	}
	data, _ := json.Marshal(schema)
	var decoded ConfigSchema
	_ = json.Unmarshal(data, &decoded)

	if len(decoded.Options) != 2 {
		t.Errorf("expected 2 options, got %d", len(decoded.Options))
	}
	if decoded.Options[1].Value != "5" {
		t.Errorf("Options[1].Value: want '5', got %q", decoded.Options[1].Value)
	}
}

// --- SidecarRequest / SidecarResponse ---

func TestSidecarRequest_JSONRoundTrip(t *testing.T) {
	req := SidecarRequest{
		ModuleID: "custom.gpu",
		Template: &RenderConfig{ID: "custom.gpu", Type: TypeKeyValue, Title: "GPU"},
		Data:     &DataPayload{Value: 55.0},
	}
	data, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded SidecarRequest
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.ModuleID != "custom.gpu" {
		t.Errorf("ModuleID: want 'custom.gpu', got %q", decoded.ModuleID)
	}
	if decoded.Template == nil || decoded.Template.Title != "GPU" {
		t.Errorf("Template not properly decoded: %+v", decoded.Template)
	}
}

func TestSidecarResponse_WithProps(t *testing.T) {
	resp := SidecarResponse{
		Status: "ok",
		Props:  map[string]any{"alert_threshold": 90.0},
	}
	data, _ := json.Marshal(resp)
	var decoded SidecarResponse
	_ = json.Unmarshal(data, &decoded)

	if decoded.Status != "ok" {
		t.Errorf("Status: want 'ok', got %q", decoded.Status)
	}
	if decoded.Props["alert_threshold"] != 90.0 {
		t.Errorf("Props[alert_threshold]: want 90.0, got %v", decoded.Props["alert_threshold"])
	}
}

// --- StatEntry / StatsResponse ---

func TestStatEntry_IsOfflineOmitEmpty(t *testing.T) {
	entry := StatEntry{ID: "cpu", Type: TypeGauge, Title: "CPU", IsOffline: false}
	data, _ := json.Marshal(entry)

	var raw map[string]any
	_ = json.Unmarshal(data, &raw)
	if _, ok := raw["is_offline"]; ok {
		t.Error("is_offline should be omitted when false")
	}
}

func TestStatsResponse_MultipleWidgets(t *testing.T) {
	resp := StatsResponse{
		Widgets: map[string]StatEntry{
			"cpu": {ID: "cpu", Type: TypeGauge},
			"mem": {ID: "mem", Type: TypeGauge, IsOffline: true},
		},
	}
	data, _ := json.Marshal(resp)
	var decoded StatsResponse
	_ = json.Unmarshal(data, &decoded)

	if len(decoded.Widgets) != 2 {
		t.Errorf("expected 2 widgets, got %d", len(decoded.Widgets))
	}
	if !decoded.Widgets["mem"].IsOffline {
		t.Error("mem widget should be offline")
	}
}
