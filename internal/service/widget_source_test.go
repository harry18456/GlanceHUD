package service

import (
	"glancehud/internal/protocol"
	"testing"
	"time"
)

// --- SidecarSource construction helpers ---

func newTestSidecar(id string) *SidecarSource {
	return &SidecarSource{
		id: id,
		config: protocol.RenderConfig{
			ID:    id,
			Type:  protocol.TypeKeyValue,
			Title: "Test Widget",
		},
		lastSeen: time.Now(),
	}
}

// --- ID ---

func TestSidecarSource_ID(t *testing.T) {
	s := newTestSidecar("custom.test")
	if s.ID() != "custom.test" {
		t.Errorf("ID: want 'custom.test', got %q", s.ID())
	}
}

// --- GetRenderConfig ---

func TestSidecarSource_GetRenderConfig(t *testing.T) {
	s := newTestSidecar("custom.gpu")
	rc := s.GetRenderConfig()
	if rc.ID != "custom.gpu" {
		t.Errorf("RenderConfig.ID: want 'custom.gpu', got %q", rc.ID)
	}
	if rc.Type != protocol.TypeKeyValue {
		t.Errorf("RenderConfig.Type: want %q, got %q", protocol.TypeKeyValue, rc.Type)
	}
}

// --- GetConfigSchema ---

func TestSidecarSource_GetConfigSchema_Empty(t *testing.T) {
	s := newTestSidecar("custom.x")
	schema := s.GetConfigSchema()
	if schema != nil {
		t.Errorf("expected nil schema, got %v", schema)
	}
}

func TestSidecarSource_GetConfigSchema_WithSchema(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.schema = []protocol.ConfigSchema{
		{Name: "threshold", Type: protocol.ConfigNumber, Default: 80.0},
	}
	schema := s.GetConfigSchema()
	if len(schema) != 1 {
		t.Errorf("expected 1 schema entry, got %d", len(schema))
	}
	if schema[0].Name != "threshold" {
		t.Errorf("schema[0].Name: want 'threshold', got %q", schema[0].Name)
	}
}

// --- ApplyConfig ---

func TestSidecarSource_ApplyConfig_StoresProps(t *testing.T) {
	s := newTestSidecar("custom.x")
	props := map[string]interface{}{"color": "#ff0000", "size": 42.0}
	s.ApplyConfig(props)

	if s.currentProps["color"] != "#ff0000" {
		t.Errorf("currentProps[color]: want '#ff0000', got %v", s.currentProps["color"])
	}
	if s.currentProps["size"] != 42.0 {
		t.Errorf("currentProps[size]: want 42.0, got %v", s.currentProps["size"])
	}
}

func TestSidecarSource_ApplyConfig_IsolatesCopy(t *testing.T) {
	// Mutation of original map should not affect stored props
	s := newTestSidecar("custom.x")
	original := map[string]interface{}{"key": "original"}
	s.ApplyConfig(original)

	original["key"] = "mutated"
	if s.currentProps["key"] != "original" {
		t.Errorf("ApplyConfig should copy props, not reference: got %v", s.currentProps["key"])
	}
}

func TestSidecarSource_ApplyConfig_OverwritesPrevious(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.ApplyConfig(map[string]interface{}{"a": 1.0})
	s.ApplyConfig(map[string]interface{}{"b": 2.0})

	if _, ok := s.currentProps["a"]; ok {
		t.Error("ApplyConfig should overwrite previous props, 'a' should be gone")
	}
	if s.currentProps["b"] != 2.0 {
		t.Errorf("currentProps[b]: want 2.0, got %v", s.currentProps["b"])
	}
}

// --- updateTemplate ---

func TestSidecarSource_UpdateTemplate_SetsConfig(t *testing.T) {
	s := newTestSidecar("custom.x")
	newTmpl := protocol.RenderConfig{
		ID:    "ignored-id", // should be overridden by s.id
		Type:  protocol.TypeGauge,
		Title: "New Title",
	}
	newSchema := []protocol.ConfigSchema{
		{Name: "max", Type: protocol.ConfigNumber, Default: 100.0},
	}

	s.updateTemplate(newTmpl, newSchema)

	if s.config.Type != protocol.TypeGauge {
		t.Errorf("Type: want %q, got %q", protocol.TypeGauge, s.config.Type)
	}
	if s.config.Title != "New Title" {
		t.Errorf("Title: want 'New Title', got %q", s.config.Title)
	}
	// ID must always be s.id, not the template's ID
	if s.config.ID != "custom.x" {
		t.Errorf("ID: want 'custom.x', got %q", s.config.ID)
	}
	if len(s.schema) != 1 || s.schema[0].Name != "max" {
		t.Errorf("schema not updated properly: %+v", s.schema)
	}
}

// --- markSeen ---

func TestSidecarSource_MarkSeen_ResetsOffline(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.isOffline = true
	before := time.Now()

	s.markSeen()

	if s.isOffline {
		t.Error("isOffline should be false after markSeen")
	}
	if s.lastSeen.Before(before) {
		t.Error("lastSeen should be updated to a recent time")
	}
}

func TestSidecarSource_MarkSeen_UpdatesTimestamp(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.lastSeen = time.Time{} // zero time

	s.markSeen()

	if time.Since(s.lastSeen) > time.Second {
		t.Error("lastSeen not updated to recent time")
	}
}

// --- Offline/TTL simulation ---

func TestSidecarSource_OfflineState(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.lastSeen = time.Now().Add(-15 * time.Second) // 15s ago → past the 10s TTL

	// Simulate what SystemService TTL checker does
	ttl := 10 * time.Second
	if time.Since(s.lastSeen) > ttl {
		s.isOffline = true
	}

	if !s.isOffline {
		t.Error("sidecar should be offline after TTL exceeded")
	}
}

func TestSidecarSource_NotOfflineWithinTTL(t *testing.T) {
	s := newTestSidecar("custom.x")
	s.lastSeen = time.Now().Add(-5 * time.Second) // 5s ago → within 10s TTL

	ttl := 10 * time.Second
	if time.Since(s.lastSeen) > ttl {
		s.isOffline = true
	}

	if s.isOffline {
		t.Error("sidecar should NOT be offline when within TTL")
	}
}

// --- WidgetSource interface compliance ---

func TestSidecarSource_ImplementsWidgetSource(t *testing.T) {
	var _ WidgetSource = (*SidecarSource)(nil)
}
