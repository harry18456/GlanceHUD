package modules

import (
	"encoding/json"
	"glancehud/internal/protocol"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// stubModule is a minimal Module implementation used in tests.
type stubModule struct {
	id     string
	schema []protocol.ConfigSchema
}

func (m *stubModule) ID() string                               { return m.id }
func (m *stubModule) GetRenderConfig() protocol.RenderConfig   { return protocol.RenderConfig{} }
func (m *stubModule) GetConfigSchema() []protocol.ConfigSchema { return m.schema }
func (m *stubModule) Update() (*protocol.DataPayload, error)   { return nil, nil }
func (m *stubModule) ApplyConfig(_ map[string]interface{})     {}
func (m *stubModule) Interval() time.Duration                  { return time.Second }

// --- withDefaults tests ---

func TestWithDefaults_ZeroOpacity(t *testing.T) {
	cs := &ConfigService{}
	cfg := cs.withDefaults(AppConfig{Opacity: 0})
	if cfg.Opacity != 0.72 {
		t.Errorf("expected default opacity 0.72, got %v", cfg.Opacity)
	}
}

func TestWithDefaults_NegativeOpacity(t *testing.T) {
	cs := &ConfigService{}
	cfg := cs.withDefaults(AppConfig{Opacity: -1})
	if cfg.Opacity != 0.72 {
		t.Errorf("expected default opacity 0.72, got %v", cfg.Opacity)
	}
}

func TestWithDefaults_ExplicitOpacity(t *testing.T) {
	cs := &ConfigService{}
	cfg := cs.withDefaults(AppConfig{Opacity: 0.5})
	if cfg.Opacity != 0.5 {
		t.Errorf("expected opacity 0.5, got %v", cfg.Opacity)
	}
}

func TestWithDefaults_EmptyWindowMode(t *testing.T) {
	cs := &ConfigService{}
	cfg := cs.withDefaults(AppConfig{})
	if cfg.WindowMode != "normal" {
		t.Errorf("expected default WindowMode 'normal', got %q", cfg.WindowMode)
	}
}

func TestWithDefaults_ExplicitWindowMode(t *testing.T) {
	cs := &ConfigService{}
	cfg := cs.withDefaults(AppConfig{WindowMode: "locked"})
	if cfg.WindowMode != "locked" {
		t.Errorf("expected WindowMode 'locked', got %q", cfg.WindowMode)
	}
}

// --- buildDefaultWidgets tests ---

func TestBuildDefaultWidgets_UsesSchemaDefaults(t *testing.T) {
	mods := map[string]Module{
		"cpu": &stubModule{
			id: "cpu",
			schema: []protocol.ConfigSchema{
				{Name: "threshold", Default: 80.0, Type: protocol.ConfigNumber},
			},
		},
		"mem": &stubModule{id: "mem"},
	}

	widgets := buildDefaultWidgets(mods)
	if len(widgets) == 0 {
		t.Fatal("expected widgets, got none")
	}

	var cpuWidget *WidgetConfig
	for i := range widgets {
		if widgets[i].ID == "cpu" {
			cpuWidget = &widgets[i]
			break
		}
	}
	if cpuWidget == nil {
		t.Fatal("cpu widget not found")
	}
	if cpuWidget.Props["threshold"] != 80.0 {
		t.Errorf("expected threshold=80.0, got %v", cpuWidget.Props["threshold"])
	}
	if !cpuWidget.Enabled {
		t.Error("expected widget to be enabled by default")
	}
}

func TestBuildDefaultWidgets_FixedOrder(t *testing.T) {
	mods := map[string]Module{
		"cpu":  &stubModule{id: "cpu"},
		"mem":  &stubModule{id: "mem"},
		"disk": &stubModule{id: "disk"},
		"net":  &stubModule{id: "net"},
	}
	widgets := buildDefaultWidgets(mods)
	want := []string{"cpu", "mem", "disk", "net"}
	for i, w := range widgets {
		if w.ID != want[i] {
			t.Errorf("position %d: want %q, got %q", i, want[i], w.ID)
		}
	}
}

func TestBuildDefaultWidgets_SkipsMissingModules(t *testing.T) {
	// Only "cpu" and "net" in order, "mem" and "disk" missing
	mods := map[string]Module{
		"cpu": &stubModule{id: "cpu"},
		"net": &stubModule{id: "net"},
	}
	widgets := buildDefaultWidgets(mods)
	if len(widgets) != 2 {
		t.Errorf("expected 2 widgets, got %d", len(widgets))
	}
}

func TestBuildDefaultWidgets_EmptySchemaNoProps(t *testing.T) {
	mods := map[string]Module{
		"cpu": &stubModule{id: "cpu", schema: []protocol.ConfigSchema{}},
	}
	widgets := buildDefaultWidgets(mods)
	if len(widgets) != 1 {
		t.Fatal("expected 1 widget")
	}
	if widgets[0].Props != nil {
		t.Errorf("expected nil Props for empty schema, got %v", widgets[0].Props)
	}
}

// --- Save / Load round-trip tests ---

func TestSaveAndLoad_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	cs := &ConfigService{
		configPath: filepath.Join(dir, "config.json"),
		Config: AppConfig{
			Opacity:    0.8,
			WindowMode: "locked",
			Widgets:    []WidgetConfig{{ID: "cpu", Enabled: true}},
		},
	}

	if err := cs.Save(); err != nil {
		t.Fatalf("Save() error: %v", err)
	}

	cs2 := &ConfigService{configPath: cs.configPath}
	if err := cs2.Load(); err != nil {
		t.Fatalf("Load() error: %v", err)
	}

	if cs2.Config.Opacity != 0.8 {
		t.Errorf("expected Opacity 0.8, got %v", cs2.Config.Opacity)
	}
	if cs2.Config.WindowMode != "locked" {
		t.Errorf("expected WindowMode 'locked', got %q", cs2.Config.WindowMode)
	}
	if len(cs2.Config.Widgets) != 1 || cs2.Config.Widgets[0].ID != "cpu" {
		t.Errorf("unexpected Widgets: %+v", cs2.Config.Widgets)
	}
}

func TestLoad_FileNotFound(t *testing.T) {
	dir := t.TempDir()
	cs := &ConfigService{configPath: filepath.Join(dir, "nonexistent.json")}
	if err := cs.Load(); err == nil {
		t.Error("expected error for missing file, got nil")
	}
}

func TestSave_InvalidPath(t *testing.T) {
	cs := &ConfigService{configPath: "/nonexistent/dir/config.json"}
	if err := cs.Save(); err == nil {
		t.Error("expected error for invalid path, got nil")
	}
}

// --- JSON serialization tests ---

func TestAppConfig_JSONRoundTrip(t *testing.T) {
	original := AppConfig{
		Opacity:      0.6,
		WindowMode:   "normal",
		MinimalMode:  true,
		DebugConsole: false,
		Widgets: []WidgetConfig{
			{ID: "mem", Enabled: false, Props: map[string]interface{}{"threshold": 80.0}},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal error: %v", err)
	}

	var decoded AppConfig
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal error: %v", err)
	}

	if decoded.Opacity != original.Opacity {
		t.Errorf("Opacity mismatch: got %v, want %v", decoded.Opacity, original.Opacity)
	}
	if decoded.MinimalMode != original.MinimalMode {
		t.Errorf("MinimalMode mismatch: got %v, want %v", decoded.MinimalMode, original.MinimalMode)
	}
	if len(decoded.Widgets) != 1 || decoded.Widgets[0].ID != "mem" {
		t.Errorf("Widgets mismatch: %+v", decoded.Widgets)
	}
}

// --- GetConfig tests ---

func TestGetConfig_AppliesDefaults(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	if err := os.WriteFile(path, []byte(`{"widgets":[]}`), 0644); err != nil {
		t.Fatal(err)
	}

	cs := &ConfigService{configPath: path}
	if err := cs.Load(); err != nil {
		t.Fatal(err)
	}

	got := cs.GetConfig()
	if got.Opacity != 0.72 {
		t.Errorf("expected default opacity 0.72, got %v", got.Opacity)
	}
	if got.WindowMode != "normal" {
		t.Errorf("expected default WindowMode 'normal', got %q", got.WindowMode)
	}
}

// --- UpdateConfig tests ---

func TestUpdateConfig_PersistsToDisk(t *testing.T) {
	dir := t.TempDir()
	cs := &ConfigService{
		configPath: filepath.Join(dir, "config.json"),
		Config:     AppConfig{Opacity: 0.5},
	}
	_ = cs.Save()

	if err := cs.UpdateConfig(AppConfig{Opacity: 0.9, WindowMode: "locked"}); err != nil {
		t.Fatalf("UpdateConfig error: %v", err)
	}

	data, _ := os.ReadFile(cs.configPath)
	var fromDisk AppConfig
	_ = json.Unmarshal(data, &fromDisk)

	if fromDisk.Opacity != 0.9 {
		t.Errorf("expected Opacity 0.9 on disk, got %v", fromDisk.Opacity)
	}
	if fromDisk.WindowMode != "locked" {
		t.Errorf("expected WindowMode 'locked' on disk, got %q", fromDisk.WindowMode)
	}
}
