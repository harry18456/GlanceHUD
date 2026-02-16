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
	Widgets []WidgetConfig `json:"widgets"`
	Theme   string         `json:"theme"`
}

type ConfigService struct {
	configPath string
	Config     AppConfig
	mu         sync.RWMutex
}

func NewConfigService(configDir string) (*ConfigService, error) {
	configPath := filepath.Join(configDir, "config.json")

	cs := &ConfigService{
		configPath: configPath,
		Config: AppConfig{
			Widgets: []WidgetConfig{
				{ID: "cpu", Enabled: true},
				{ID: "mem", Enabled: true},
				{ID: "disk", Enabled: true},
				{ID: "net", Enabled: true},
			},
			Theme: "neon",
		},
	}

	// Try to load existing config
	if err := cs.Load(); err != nil {
		// If load fails (e.g. file not found), save default
		_ = cs.Save()
	}

	return cs, nil
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
