package main

import (
	"glancehud/internal/modules"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// SystemService now acts as the orchestrator
type SystemService struct {
	configService *modules.ConfigService
	modules       map[string]modules.Module
}

func NewSystemService(app *application.App) *SystemService {
	// Get app data directory for config
	// wails3 beta doesn't have a direct helper yet?
	// For simplicity, let's use "." or try to find a good path.
	// Ideally application.Get().Paths().Config() but let's assume relative for portable or user home.
	configDir := "."

	cs, _ := modules.NewConfigService(configDir)

	return &SystemService{
		configService: cs,
		modules: map[string]modules.Module{
			"cpu":  modules.NewCPUModule(),
			"mem":  modules.NewMemModule(),
			"disk": modules.NewDiskModule("C:\\"), // TODO: Make dynamic based on config
			"net":  modules.NewNetModule(),
		},
	}
}

// GetConfig returns the current app configuration.
func (s *SystemService) GetConfig() modules.AppConfig {
	return s.configService.GetConfig()
}

// SaveConfig updates and saves the configuration.
func (s *SystemService) SaveConfig(config modules.AppConfig) error {
	// Logic to re-init modules if props changed could go here
	// For now just save
	return s.configService.UpdateConfig(config)
}

// GetSystemStats iterates over enabled modules and returns their data.
func (s *SystemService) GetSystemStats() ([]modules.ModuleData, error) {
	config := s.configService.GetConfig()
	results := []modules.ModuleData{}

	for _, widgetCfg := range config.Widgets {
		if !widgetCfg.Enabled {
			continue
		}

		mod, exists := s.modules[widgetCfg.ID]
		if !exists {
			// Maybe initialize on demand if it's dynamic like "disk D:\"
			// For MVP, just skip
			continue
		}

		data, err := mod.Update()
		if err != nil {
			// Log error but continue?
			// For now, return error or append partial
			continue
		}
		results = append(results, *data)
	}

	return results, nil
}
