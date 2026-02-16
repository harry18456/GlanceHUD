package modules

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type WidgetConfig struct {
	ID      string                 `json:"id"`
	Enabled bool                   `json:"enabled"`
	Props   map[string]interface{} `json:"props,omitempty"`
}

type AppConfig struct {
	Widgets     []WidgetConfig `json:"widgets"`
	Theme       string         `json:"theme"`
	MinimalMode bool           `json:"minimalMode"`
}

type ConfigService struct {
	configPath string
	Config     AppConfig
	mu         sync.RWMutex
}

// NewConfigService creates a config service. Pass in the registered modules
// so that default widget props can be derived from each module's ConfigSchema.
func NewConfigService(configDir string, modules map[string]Module) (*ConfigService, error) {
	configPath := filepath.Join(configDir, "config.json")

	// Build default widgets from registered modules
	defaults := buildDefaultWidgets(modules)

	cs := &ConfigService{
		configPath: configPath,
		Config: AppConfig{
			Widgets: defaults,
			Theme:   "neon",
		},
	}

	// Try to load existing config
	if err := cs.Load(); err != nil {
		// If load fails (e.g. file not found), save default
		_ = cs.Save()
	}

	return cs, nil
}

// buildDefaultWidgets derives default WidgetConfig from each module's ConfigSchema.
func buildDefaultWidgets(modules map[string]Module) []WidgetConfig {
	// Fixed order so config.json is deterministic
	order := []string{"cpu", "mem", "disk", "net"}

	var widgets []WidgetConfig
	for _, id := range order {
		mod, ok := modules[id]
		if !ok {
			continue
		}

		props := make(map[string]interface{})
		for _, schema := range mod.GetConfigSchema() {
			if schema.Name != "" && schema.Default != nil {
				props[schema.Name] = schema.Default
			}
		}

		wc := WidgetConfig{
			ID:      id,
			Enabled: true,
		}
		if len(props) > 0 {
			wc.Props = props
		}
		widgets = append(widgets, wc)
	}
	return widgets
}

func (cs *ConfigService) Load() error {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	data, err := os.ReadFile(cs.configPath)
	if err != nil {
		return err
	}

	return json.Unmarshal(data, &cs.Config)
}

func (cs *ConfigService) Save() error {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	data, err := json.MarshalIndent(cs.Config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(cs.configPath, data, 0644)
}

func (cs *ConfigService) GetConfig() AppConfig {
	cs.mu.RLock()
	defer cs.mu.RUnlock()
	return cs.Config
}

func (cs *ConfigService) UpdateConfig(newConfig AppConfig) error {
	cs.mu.Lock()
	cs.Config = newConfig
	cs.mu.Unlock()
	return cs.Save()
}
