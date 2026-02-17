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
	modules       map[string]modules.Module // immutable after init
	stopChans     map[string]chan struct{}
	cache         map[string]*protocol.DataPayload
	sidecars      map[string]*SidecarModule
	mu            sync.RWMutex
}

type SidecarModule struct {
	ID          string
	Config      protocol.RenderConfig
	LastSeen    time.Time
	IsOffline   bool
	CurrentData *protocol.DataPayload
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

	s := &SystemService{
		configService: cs,
		modules:       mods,
		stopChans:     make(map[string]chan struct{}),
		cache:         make(map[string]*protocol.DataPayload),
		sidecars:      make(map[string]*SidecarModule),
	}

	// Start TTL checker
	go s.runTTLChecker()

	return s
}

func (s *SystemService) Start(app *application.App) {
	s.app = app
	s.StartMonitoring()
}

// RegisterSidecar handles lazy registration.
// If config is provided (template), it updates the sidecar definition.
// If it's a new sidecar, it also adds it to the persistent config (enabled by default).
func (s *SystemService) RegisterSidecar(id string, config *protocol.RenderConfig) {
	s.mu.Lock()

	sidecar, exists := s.sidecars[id]
	if !exists {
		sidecar = &SidecarModule{
			ID:       id,
			LastSeen: time.Now(),
		}
		s.sidecars[id] = sidecar
	}

	if config != nil {
		sidecar.Config = *config
		sidecar.Config.ID = id
	}

	sidecar.LastSeen = time.Now()
	sidecar.IsOffline = false
	s.mu.Unlock()

	// If this sidecar was just added to runtime memory (new sidecar connection for this session),
	// we must notify frontend to reload modules list, even if it was already in config.json.
	if !exists && s.app != nil {
		s.app.Event.Emit("config:reload", nil)
	}

	// Persist to Config if new (async to avoid deadlock with SaveConfig -> StartMonitoring -> Lock)
	if config != nil && !exists {
		go s.ensureSidecarInConfig(id, *config)
	}
}

func (s *SystemService) ensureSidecarInConfig(id string, tmpl protocol.RenderConfig) {
	appConfig := s.configService.GetConfig()
	found := false
	for _, w := range appConfig.Widgets {
		if w.ID == id {
			found = true
			break
		}
	}

	if !found {
		// Add new widget config
		newWidget := modules.WidgetConfig{
			ID:      id,
			Enabled: true,
			Props:   tmpl.Props, // Use default props from template
		}
		// We append it to the end
		appConfig.Widgets = append(appConfig.Widgets, newWidget)

		// SaveConfig triggers StartMonitoring, which is fine
		_ = s.SaveConfig(appConfig)
		fmt.Printf("[Detected New Sidecar] Added %s to config\n", id)
	}
}

// UpdateSidecarData updates data for a sidecar module
func (s *SystemService) UpdateSidecarData(id string, data *protocol.DataPayload) {
	s.mu.Lock()

	sidecar, exists := s.sidecars[id]
	if !exists {
		s.mu.Unlock()
		return // Should be registered first via RegisterSidecar (lazy pattern mandates it)
	}

	sidecar.LastSeen = time.Now()
	sidecar.IsOffline = false
	sidecar.CurrentData = data

	// Update cache
	s.cache[id] = data
	s.mu.Unlock()

	// Emit event
	if s.app != nil {
		s.app.Event.Emit("stats:update", protocol.UpdateEvent{
			ID:   id,
			Data: data,
		})
	}
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
	for id, sidecar := range s.sidecars {
		// Check if offline (LastSeen > 10s)
		if !sidecar.IsOffline && now.Sub(sidecar.LastSeen) > 10*time.Second {
			sidecar.IsOffline = true

			// Prepare offline payload
			offlineData := &protocol.DataPayload{}
			if sidecar.CurrentData != nil {
				// Copy existing data to retain value
				*offlineData = *sidecar.CurrentData
			}

			// Add offline prop
			if offlineData.Props == nil {
				offlineData.Props = make(map[string]any)
			}
			offlineData.Props["isOffline"] = true

			// Update cache
			s.cache[id] = offlineData

			// Emit update immediately
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

		// Check Sidecars (Priority to sidecars if name collision? or Native?)
		// Let's check Native first
		if mod, exists := s.modules[widgetCfg.ID]; exists {
			// Native Module Logic as before...
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
			continue
		}

		// If not native, check if it's a known Sidecar
		if sc, exists := s.sidecars[widgetCfg.ID]; exists {
			// Sidecars don't need "monitorTask" (pushed based)
			// But we should restore their cache if we have any?
			// Actually StartMonitoring resets cache.
			// Sidecars need to push data again to be seen?
			// Protocol says "Sidecar must send heartbeat".
			// So it's fine if we start empty.
			// But we might want to keep the "Config" logic if we want to support Props override from Settings?
			// Currently Sidecar handles its own props via DataPayload.
			// But if user sets props in Settings (e.g. override color), we need to merge it?
			// Phase 4 implies simple push. Merging config.Props (from settings) to sidecar payload is a bit complex
			// because Sidecar controls the payload.
			// Ideally Sidecar payload props wins, OR config wins?
			// For now let's minimal implementation: Sidecar pushes everything.

			// We DO need to put sidecar into cache if we have LastData?
			// No, s.cache is reset. Sidecar needs to push again.

			// However, we should make sure we respect "Enabled" status.
			// RegisterSidecar adds it to config.Enabled=true.
			// If user disables it, RegisterSidecar still tracking it but we shouldn't Emit?
			// UpdateSidecarData currently emits without checks.
			// We should probably check Enabled status in UpdateSidecarData?
			// Implementation Detail: UpdateSidecarData should check if ID is enabled in config?
			// That would be slow (reading config every push).
			// Maybe we cache "Enabled" state in SidecarModule?
			_ = sc
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

	var infos []ModuleInfo
	processedIDs := make(map[string]bool)

	// 1. Configured modules (Native + Sidecar)
	for _, w := range config.Widgets {
		// Native
		if mod, exists := s.modules[w.ID]; exists {
			infos = append(infos, ModuleInfo{
				ModuleID: w.ID,
				Config:   mod.GetRenderConfig(),
				Enabled:  w.Enabled,
			})
			processedIDs[w.ID] = true
			continue
		}
		// Sidecar
		if sc, exists := s.sidecars[w.ID]; exists {
			infos = append(infos, ModuleInfo{
				ModuleID: w.ID,
				Config:   sc.Config, // Should be populated by RegisterSidecar
				Enabled:  w.Enabled,
			})
			processedIDs[w.ID] = true
			continue
		}
	}

	// 2. Unconfigured Sidecars (Just in case they are registered but not in config yet? Async race?)
	// Actually RegisterSidecar adds to config async.
	// If GetModules is called before ensureSidecarInConfig finishes, we might miss it.
	// So let's add them here just in case.
	s.mu.RLock() // Lock for reading sidecars
	for id, sc := range s.sidecars {
		if !processedIDs[id] {
			infos = append(infos, ModuleInfo{
				ModuleID: id,
				Config:   sc.Config,
				Enabled:  true, // Default true for new sidecars
			})
		}
	}
	s.mu.RUnlock()

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

	// Phase 4: Sidecar Config Schema?
	// Currently Sidecars don't have Config Schema (they are code-driven).
	// But we might want generic "Enabled" toggle which is handled by frontend regardless of schema.
	return nil, nil
}
