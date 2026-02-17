package main

import (
	"fmt"
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
	mods := map[string]modules.Module{
		"cpu":  modules.NewCPUModule(),
		"mem":  modules.NewMemModule(),
		"disk": modules.NewDiskModule(""),
		"net":  modules.NewNetModule(),
	}

	configDir := "."
	cs, _ := modules.NewConfigService(configDir, mods)

	return &SystemService{
		configService: cs,
		modules:       mods,
		stopChans:     make(map[string]chan struct{}),
		cache:         make(map[string]*protocol.DataPayload),
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

// ModuleInfo pairs the short config ID with the display RenderConfig.
type ModuleInfo struct {
	ModuleID string                `json:"moduleId"` // short ID for config ("cpu","disk",...)
	Config   protocol.RenderConfig `json:"config"`   // display template
	Enabled  bool                  `json:"enabled"`   // whether the module is active
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

		// Merge global minimalMode into per-widget props
		mergedProps := make(map[string]interface{})
		for k, v := range widgetCfg.Props {
			mergedProps[k] = v
		}
		mergedProps["minimal_mode"] = config.MinimalMode
		mod.ApplyConfig(mergedProps)

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

// SetWindowMode updates windowMode ("normal"|"locked") in config and emits mode:change event.
func (s *SystemService) SetWindowMode(mode string) error {
	if mode != "normal" && mode != "locked" {
		return fmt.Errorf("invalid window mode: %q", mode)
	}
	config := s.configService.GetConfig()
	config.WindowMode = mode
	if err := s.configService.UpdateConfig(config); err != nil {
		return err
	}
	s.app.Event.Emit("mode:change", map[string]string{"windowMode": mode})
	return nil
}

// SetEditMode emits an edit mode toggle event to the frontend.
func (s *SystemService) SetEditMode(enabled bool) {
	s.app.Event.Emit("mode:change", map[string]interface{}{
		"editMode": enabled,
	})
}

// UpdateOpacity updates opacity in config and emits config:update event.
func (s *SystemService) UpdateOpacity(opacity float64) error {
	if opacity < 0.1 || opacity > 1.0 {
		return fmt.Errorf("opacity must be between 0.1 and 1.0, got %f", opacity)
	}
	config := s.configService.GetConfig()
	config.Opacity = opacity
	if err := s.configService.UpdateConfig(config); err != nil {
		return err
	}
	s.app.Event.Emit("config:update", map[string]interface{}{
		"opacity": opacity,
	})
	return nil
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

// GetModules returns the list of available modules with their short IDs, render configs, and enabled state.
func (s *SystemService) GetModules() ([]ModuleInfo, error) {
	config := s.configService.GetConfig()

	// Build lookup: shortID → enabled
	enabledMap := make(map[string]bool)
	for _, w := range config.Widgets {
		enabledMap[w.ID] = w.Enabled
	}

	// Iterate in config.Widgets order for deterministic UI ordering
	var infos []ModuleInfo
	for _, w := range config.Widgets {
		mod, exists := s.modules[w.ID]
		if !exists {
			continue
		}
		infos = append(infos, ModuleInfo{
			ModuleID: w.ID,
			Config:   mod.GetRenderConfig(),
			Enabled:  w.Enabled,
		})
	}
	return infos, nil
}

// GetModuleConfigSchema returns the config schema for a specific module.
// Accepts either the short module ID ("disk") or the full render ID ("glancehud.core.disk").
func (s *SystemService) GetModuleConfigSchema(moduleID string) ([]protocol.ConfigSchema, error) {
	// Try short ID first
	if mod, ok := s.modules[moduleID]; ok {
		return mod.GetConfigSchema(), nil
	}
	// Fallback: match by RenderConfig.ID
	for _, mod := range s.modules {
		if mod.GetRenderConfig().ID == moduleID {
			return mod.GetConfigSchema(), nil
		}
	}
	return nil, nil
}
