package service

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
	sources       map[string]WidgetSource // unified: native modules + sidecars
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

	sources := make(map[string]WidgetSource, len(mods))
	for id, mod := range mods {
		sources[id] = mod
	}

	s := &SystemService{
		configService: cs,
		sources:       sources,
		stopChans:     make(map[string]chan struct{}),
		cache:         make(map[string]*protocol.DataPayload),
	}

	go s.runTTLChecker()

	return s
}

func (s *SystemService) Start(app *application.App) {
	s.app = app
	s.StartMonitoring()
}

// RegisterSidecar handles lazy registration of sidecar widgets.
// Native modules take precedence: if a native module with the same ID already
// exists, this call is silently ignored.
func (s *SystemService) RegisterSidecar(id string, config *protocol.RenderConfig, schema []protocol.ConfigSchema) {
	s.mu.Lock()

	// Native module wins – do not overwrite
	if _, isNative := s.sources[id].(modules.Module); isNative {
		fmt.Printf("[RegisterSidecar] Ignoring sidecar %q: native module with same ID exists\n", id)
		s.mu.Unlock()
		return
	}

	existing, exists := s.sources[id]
	var sc *SidecarSource
	if exists {
		var ok bool
		sc, ok = existing.(*SidecarSource)
		if !ok {
			// Should never happen: unknown WidgetSource implementation
			fmt.Printf("[RegisterSidecar] Unexpected source type for %q, skipping\n", id)
			s.mu.Unlock()
			return
		}
	} else {
		sc = &SidecarSource{
			id:       id,
			lastSeen: time.Now(),
		}
		s.sources[id] = sc
	}

	if config != nil {
		sc.updateTemplate(*config, schema)
	} else if schema != nil {
		sc.schema = schema
	}

	sc.markSeen()
	s.mu.Unlock()

	if !exists && s.app != nil {
		s.app.Event.Emit("config:reload", nil)
	}

	if config != nil && !exists {
		go s.ensureSidecarInConfig(id, *config)
	}
}

func (s *SystemService) ensureSidecarInConfig(id string, tmpl protocol.RenderConfig) {
	appConfig := s.configService.GetConfig()
	for _, w := range appConfig.Widgets {
		if w.ID == id {
			return
		}
	}

	newWidget := modules.WidgetConfig{
		ID:      id,
		Enabled: true,
		Props:   tmpl.Props,
	}
	appConfig.Widgets = append(appConfig.Widgets, newWidget)

	_ = s.SaveConfig(appConfig)
	fmt.Printf("[Detected New Sidecar] Added %s to config\n", id)
}

// UpdateSidecarData updates data for a sidecar source and returns the current
// merged props (so the sidecar can read back settings set by the user).
func (s *SystemService) UpdateSidecarData(id string, data *protocol.DataPayload) map[string]interface{} {
	s.mu.Lock()

	src, exists := s.sources[id]
	if !exists {
		s.mu.Unlock()
		return nil
	}

	sc, ok := src.(*SidecarSource)
	if !ok {
		s.mu.Unlock()
		return nil
	}

	sc.markSeen()
	sc.currentData = data
	s.cache[id] = data

	props := sc.currentProps
	s.mu.Unlock()

	if s.app != nil {
		s.app.Event.Emit("stats:update", protocol.UpdateEvent{
			ID:   id,
			Data: data,
		})
	}

	return props
}

func (s *SystemService) runTTLChecker() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.checkSidecarTTL()
	}
}

func (s *SystemService) checkSidecarTTL() {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	for id, src := range s.sources {
		sc, ok := src.(*SidecarSource)
		if !ok {
			continue
		}

		if !sc.isOffline && now.Sub(sc.lastSeen) > 10*time.Second {
			sc.isOffline = true

			// Deep copy to avoid mutating sc.currentData.Props via shared map reference
			offlineData := &protocol.DataPayload{}
			if sc.currentData != nil {
				*offlineData = *sc.currentData
				if sc.currentData.Props != nil {
					propsCopy := make(map[string]any, len(sc.currentData.Props))
					for k, v := range sc.currentData.Props {
						propsCopy[k] = v
					}
					offlineData.Props = propsCopy
				} else {
					offlineData.Props = nil
				}
			}
			if offlineData.Props == nil {
				offlineData.Props = make(map[string]any)
			}
			offlineData.Props["isOffline"] = true

			s.cache[id] = offlineData

			if s.app != nil {
				s.app.Event.Emit("stats:update", protocol.UpdateEvent{
					ID:   id,
					Data: offlineData,
				})
			}
			fmt.Printf("[Sidecar Offline] %s timed out\n", id)
		}
	}
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
	Enabled  bool                  `json:"enabled"`  // whether the module is active
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

		src, exists := s.sources[widgetCfg.ID]
		if !exists {
			continue
		}

		mergedProps := make(map[string]interface{}, len(widgetCfg.Props)+1)
		for k, v := range widgetCfg.Props {
			mergedProps[k] = v
		}
		mergedProps["minimal_mode"] = config.MinimalMode

		// ApplyConfig for all sources (native + sidecar)
		src.ApplyConfig(mergedProps)

		// Only native modules need a goroutine ticker
		if puller, ok := src.(modules.Module); ok {
			stop := make(chan struct{})
			s.stopChans[widgetCfg.ID] = stop
			tasks = append(tasks, monitorTask{
				mod:      puller,
				renderID: puller.GetRenderConfig().ID,
				stop:     stop,
			})
		}
	}

	s.mu.Unlock()

	// Phase 2: launch goroutines after lock is released
	for _, t := range tasks {
		go s.runMonitor(t.mod, t.renderID, t.stop)
	}
}

func (s *SystemService) runMonitor(m modules.Module, eventID string, stopChan chan struct{}) {
	if data, err := m.Update(); err == nil {
		s.mu.Lock()
		s.cache[eventID] = data
		s.mu.Unlock()
		if s.app != nil {
			s.app.Event.Emit("stats:update", protocol.UpdateEvent{
				ID:   eventID,
				Data: data,
			})
		}
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

// GetSystemStats kept for backward compatibility.
func (s *SystemService) GetSystemStats() (any, error) {
	return nil, nil
}

// GetCurrentData returns the last cached data for all active modules.
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

	var infos []ModuleInfo
	processedIDs := make(map[string]bool)

	// 1. Iterate configured widgets in order
	for _, w := range config.Widgets {
		s.mu.RLock()
		src, exists := s.sources[w.ID]
		var info ModuleInfo
		if exists {
			// Call GetRenderConfig under the lock to avoid race with RegisterSidecar
			info = ModuleInfo{
				ModuleID: w.ID,
				Config:   src.GetRenderConfig(),
				Enabled:  w.Enabled,
			}
		}
		s.mu.RUnlock()

		if exists {
			infos = append(infos, info)
			processedIDs[w.ID] = true
		}
	}

	// 2. Sidecars that arrived before ensureSidecarInConfig completed (async race)
	s.mu.RLock()
	for id, src := range s.sources {
		if _, isNative := src.(modules.Module); isNative {
			continue
		}
		if !processedIDs[id] {
			infos = append(infos, ModuleInfo{
				ModuleID: id,
				Config:   src.GetRenderConfig(),
				Enabled:  true,
			})
		}
	}
	s.mu.RUnlock()

	return infos, nil
}

// GetModuleConfigSchema returns the config schema for a specific module.
// Accepts either the short module ID ("disk") or the full render ID ("glancehud.core.disk").
func (s *SystemService) GetModuleConfigSchema(moduleID string) ([]protocol.ConfigSchema, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Direct match by short ID
	if src, ok := s.sources[moduleID]; ok {
		return src.GetConfigSchema(), nil
	}

	// Fallback: match by RenderConfig.ID (full namespace)
	for _, src := range s.sources {
		if src.GetRenderConfig().ID == moduleID {
			return src.GetConfigSchema(), nil
		}
	}

	return nil, nil
}
