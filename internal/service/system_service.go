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

	// Restore offline sidecar sources from persisted config so widgets remain
	// visible (as offline) on restart before the sidecar process re-registers.
	for _, wc := range cs.GetConfig().Widgets {
		if _, isNative := mods[wc.ID]; isNative {
			continue
		}
		if wc.SidecarType == "" {
			continue
		}
		sc := &SidecarSource{
			id:        wc.ID,
			isOffline: true,
		}
		sc.config = protocol.RenderConfig{
			ID:    wc.ID,
			Type:  protocol.ComponentType(wc.SidecarType),
			Title: wc.SidecarTitle,
		}
		s.sources[wc.ID] = sc
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

	// Capture whether this push is the first to provide a valid template for this source.
	// This covers two cases:
	//   1. Brand-new source (never seen before) receiving a template.
	//   2. Existing source that had no type (e.g. created by a data-only push after
	//      restart) now receiving its first template — the frontend must be told.
	gainsTemplate := config != nil && sc.config.Type == ""

	if config != nil {
		sc.updateTemplate(*config, schema)
	} else if schema != nil {
		sc.schema = schema
	}

	sc.markSeen()
	s.mu.Unlock()

	// Notify frontend only when a source gains a valid template for the first time.
	// Pure data-only pushes carry no render info; skipping the reload prevents both
	// wasted round-trips and the "Unknown Widget Type" flash.
	if gainsTemplate && s.app != nil {
		s.app.Event.Emit("config:reload", nil)
	}

	if config != nil {
		go s.ensureSidecarInConfig(id, *config, schema)
	}
}

func (s *SystemService) ensureSidecarInConfig(id string, tmpl protocol.RenderConfig, schema []protocol.ConfigSchema) {
	appConfig := s.configService.GetConfig()
	for i, w := range appConfig.Widgets {
		if w.ID == id {
			// Persist template fields so we can restore the source on next restart.
			// Only write to disk if something actually changed.
			if w.SidecarType != string(tmpl.Type) || w.SidecarTitle != tmpl.Title {
				appConfig.Widgets[i].SidecarType = string(tmpl.Type)
				appConfig.Widgets[i].SidecarTitle = tmpl.Title
				_ = s.configService.UpdateConfig(appConfig)
			}
			return
		}
	}

	// Initialise Props from schema defaults so the sidecar receives meaningful
	// values on the very first push, without requiring the user to open Settings.
	// Layer order: schema defaults (base) → tmpl.Props (render overrides on top).
	props := make(map[string]interface{})
	for _, field := range schema {
		if field.Name != "" && field.Default != nil {
			props[field.Name] = field.Default
		}
	}
	for k, v := range tmpl.Props {
		props[k] = v
	}

	newWidget := modules.WidgetConfig{
		ID:           id,
		Enabled:      true,
		Props:        props,
		SidecarType:  string(tmpl.Type),
		SidecarTitle: tmpl.Title,
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
	ModuleID  string                `json:"moduleId"`  // short ID for config ("cpu","disk",...)
	Config    protocol.RenderConfig `json:"config"`    // display template
	Enabled   bool                  `json:"enabled"`   // whether the module is active
	IsSidecar bool                  `json:"isSidecar"` // true for sidecar widgets
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

// GetStats returns a snapshot of all active widgets, optionally filtered by render ID.
// filterID may be a full render ID (e.g. "glancehud.core.cpu" or "gpu.0") or empty for all.
func (s *SystemService) GetStats(filterID string) protocol.StatsResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()

	widgets := make(map[string]protocol.StatEntry, len(s.sources))
	for _, src := range s.sources {
		cfg := src.GetRenderConfig()
		renderID := cfg.ID
		if filterID != "" && renderID != filterID {
			continue
		}
		entry := protocol.StatEntry{
			ID:    renderID,
			Type:  cfg.Type,
			Title: cfg.Title,
			Data:  s.cache[renderID],
		}
		if sc, ok := src.(*SidecarSource); ok {
			entry.IsOffline = sc.isOffline
		}
		widgets[renderID] = entry
	}
	return protocol.StatsResponse{Widgets: widgets}
}

// GetCurrentData returns the last cached data for all active modules.
// For sidecar sources that are offline and have no cached data (e.g. just restored
// from config on restart), an offline payload is synthesized so the frontend can
// display the offline overlay immediately.
func (s *SystemService) GetCurrentData() (map[string]protocol.DataPayload, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	results := make(map[string]protocol.DataPayload, len(s.cache))
	for id, data := range s.cache {
		if data != nil {
			results[id] = *data
		}
	}

	// Synthesize offline payload for restored sidecar sources not yet in cache.
	for id, src := range s.sources {
		if _, inCache := results[id]; inCache {
			continue
		}
		sc, ok := src.(*SidecarSource)
		if !ok || !sc.isOffline {
			continue
		}
		results[id] = protocol.DataPayload{
			Props: map[string]any{"isOffline": true},
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
			_, isSidecar := src.(*SidecarSource)
			// Call GetRenderConfig under the lock to avoid race with RegisterSidecar
			info = ModuleInfo{
				ModuleID:  w.ID,
				Config:    src.GetRenderConfig(),
				Enabled:   w.Enabled,
				IsSidecar: isSidecar,
			}
		}
		s.mu.RUnlock()

		if exists && info.Config.Type != "" {
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
			cfg := src.GetRenderConfig()
			if cfg.Type == "" {
				continue // skip sidecars without a valid template
			}
			infos = append(infos, ModuleInfo{
				ModuleID:  id,
				Config:    cfg,
				Enabled:   true,
				IsSidecar: true,
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

// RemoveSidecar removes a sidecar widget completely:
//   - removes from runtime sources map
//   - removes from data cache
//   - removes from persisted config (widgets array)
//   - emits config:reload so frontend refreshes
//
// Native modules cannot be removed.
func (s *SystemService) RemoveSidecar(id string) error {
	s.mu.Lock()

	src, exists := s.sources[id]
	if !exists {
		s.mu.Unlock()
		return fmt.Errorf("widget %q not found", id)
	}

	// Protect native modules from deletion
	if _, isNative := src.(modules.Module); isNative {
		s.mu.Unlock()
		return fmt.Errorf("cannot remove native module %q", id)
	}

	// Remove from runtime state
	delete(s.sources, id)

	// Remove from cache (sidecar cache key = config ID, same as source key)
	renderID := src.GetRenderConfig().ID
	delete(s.cache, id)
	if renderID != id {
		delete(s.cache, renderID)
	}

	s.mu.Unlock()

	// Remove from persisted config
	appConfig := s.configService.GetConfig()
	filtered := make([]modules.WidgetConfig, 0, len(appConfig.Widgets))
	for _, w := range appConfig.Widgets {
		if w.ID != id {
			filtered = append(filtered, w)
		}
	}
	appConfig.Widgets = filtered
	_ = s.SaveConfig(appConfig)

	fmt.Printf("[RemoveSidecar] Removed %s from sources and config\n", id)

	// Notify frontend
	if s.app != nil {
		s.app.Event.Emit("config:reload", nil)
	}

	return nil
}
