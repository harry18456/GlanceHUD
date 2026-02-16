package main

import (
	"glancehud/internal/modules"
	"glancehud/internal/protocol"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type SystemService struct {
	app           *application.App
	configService *modules.ConfigService
	modules       map[string]modules.Module
	stopChans     map[string]chan struct{}
	mu            sync.Mutex
}

func NewSystemService() *SystemService {
	configDir := "."
	cs, _ := modules.NewConfigService(configDir)

	return &SystemService{
		configService: cs,
		modules: map[string]modules.Module{
			"cpu":  modules.NewCPUModule(),
			"mem":  modules.NewMemModule(),
			"disk": modules.NewDiskModule(""),
			"net":  modules.NewNetModule(),
		},
		stopChans: make(map[string]chan struct{}),
	}
}

func (s *SystemService) Start(app *application.App) {
	s.app = app
	s.StartMonitoring()
}

func (s *SystemService) GetConfig() modules.AppConfig {
	return s.configService.GetConfig()
}

func (s *SystemService) SaveConfig(config modules.AppConfig) error {
	err := s.configService.UpdateConfig(config)
	if err != nil {
		return err
	}
	// Restart monitoring to apply new config
	s.StartMonitoring()
	return nil
}

func (s *SystemService) StartMonitoring() {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Stop all existing monitors first
	for id, ch := range s.stopChans {
		close(ch)
		delete(s.stopChans, id)
	}

	config := s.configService.GetConfig()

	for _, widgetCfg := range config.Widgets {
		if !widgetCfg.Enabled {
			continue
		}

		mod, exists := s.modules[widgetCfg.ID]
		if !exists {
			continue
		}

		// Apply config (props)
		mod.ApplyConfig(widgetCfg.Props)

		// Create stop channel
		stop := make(chan struct{})
		s.stopChans[widgetCfg.ID] = stop

		// Launch goroutine
		go func(m modules.Module, stopChan chan struct{}) {
			// Initial update
			if data, err := m.Update(); err == nil {
				s.app.Event.Emit("stats:update", data)
			}

			ticker := time.NewTicker(m.Interval())
			defer ticker.Stop()

			for {
				select {
				case <-stopChan:
					return
				case <-ticker.C:
					data, err := m.Update()
					if err != nil {
						continue
					}
					s.app.Event.Emit("stats:update", data)
				}
			}
		}(mod, stop)
	}
}

// Keep GetSystemStats for backward compatibility or immediate fetch if needed
func (s *SystemService) GetSystemStats() (any, error) {
	// Not used in Push architecture
	return nil, nil
}

// GetModules returns the list of available modules and their render configs
func (s *SystemService) GetModules() ([]protocol.RenderConfig, error) {
	var configs []protocol.RenderConfig
	// Iterate in specific order if needed, but map iteration is random.
	// We might want to use the config order?
	// For now, return all available modules' render configs.
	// Frontend can sort them based on use or config.
	for _, mod := range s.modules {
		configs = append(configs, mod.GetRenderConfig())
	}
	return configs, nil
}

// GetModuleConfigSchema returns the config schema for a specific module
func (s *SystemService) GetModuleConfigSchema(moduleID string) ([]protocol.ConfigSchema, error) {
	if mod, ok := s.modules[moduleID]; ok {
		return mod.GetConfigSchema(), nil
	}
	return nil, nil
}
