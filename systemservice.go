package main

import (
	"glancehud/internal/modules"
	"glancehud/internal/protocol"
	"reflect"
	"sync"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type SystemService struct {
	app           *application.App
	configService *modules.ConfigService
	modules       map[string]modules.Module // immutable after init
	stopChans     map[string]chan struct{}
	cache         map[string]*protocol.DataPayload
	mu            sync.RWMutex
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
		cache:     make(map[string]*protocol.DataPayload),
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
	s.StartMonitoring()
	return nil
}

type monitorTask struct {
	mod      modules.Module
	renderID string
	stop     chan struct{}
}

func (s *SystemService) StartMonitoring() {
	// Phase 1: synchronous state mutation under lock
	s.mu.Lock()

	for id, ch := range s.stopChans {
		close(ch)
		delete(s.stopChans, id)
	}

	s.cache = make(map[string]*protocol.DataPayload)
	config := s.configService.GetConfig()

	var tasks []monitorTask
	for _, widgetCfg := range config.Widgets {
		if !widgetCfg.Enabled {
			continue
		}

		mod, exists := s.modules[widgetCfg.ID]
		if !exists {
			continue
		}

		mod.ApplyConfig(widgetCfg.Props)

		stop := make(chan struct{})
		s.stopChans[widgetCfg.ID] = stop

		tasks = append(tasks, monitorTask{
			mod:      mod,
			renderID: mod.GetRenderConfig().ID,
			stop:     stop,
		})
	}

	s.mu.Unlock()

	// Phase 2: launch goroutines after lock is released
	for _, t := range tasks {
		go s.runMonitor(t.mod, t.renderID, t.stop)
	}
}

func (s *SystemService) runMonitor(m modules.Module, eventID string, stopChan chan struct{}) {
	if data, err := m.Update(); err == nil {
		s.app.Event.Emit("stats:update", protocol.UpdateEvent{
			ID:   eventID,
			Data: data,
		})
		s.mu.Lock()
		s.cache[eventID] = data
		s.mu.Unlock()
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

			// Diff check: skip emit if data unchanged
			s.mu.RLock()
			lastData, ok := s.cache[eventID]
			unchanged := ok && reflect.DeepEqual(lastData, data)
			s.mu.RUnlock()

			if unchanged {
				continue
			}

			s.mu.Lock()
			s.cache[eventID] = data
			s.mu.Unlock()

			s.app.Event.Emit("stats:update", protocol.UpdateEvent{
				ID:   eventID,
				Data: data,
			})
		}
	}
}

// Keep GetSystemStats for backward compatibility or immediate fetch if needed
func (s *SystemService) GetSystemStats() (any, error) {
	return nil, nil
}

// GetCurrentData returns the last cached data for all active modules
func (s *SystemService) GetCurrentData() (map[string]protocol.DataPayload, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make(map[string]protocol.DataPayload, len(s.cache))
	for id, data := range s.cache {
		if data != nil {
			results[id] = *data
		}
	}
	return results, nil
}

// GetModules returns the list of available modules and their render configs
func (s *SystemService) GetModules() ([]protocol.RenderConfig, error) {
	var configs []protocol.RenderConfig
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
