package service

import (
	"glancehud/internal/protocol"
	"time"
)

// WidgetSource is the unified interface for all widget data sources.
// modules.Module (native) and *SidecarSource (sidecar) both satisfy this interface.
type WidgetSource interface {
	ID() string
	GetRenderConfig() protocol.RenderConfig
	GetConfigSchema() []protocol.ConfigSchema
	ApplyConfig(props map[string]interface{})
}

// SidecarSource replaces the former SidecarModule struct.
// It implements WidgetSource for HTTP-push sidecar widgets.
type SidecarSource struct {
	id           string
	config       protocol.RenderConfig
	schema       []protocol.ConfigSchema
	currentData  *protocol.DataPayload
	lastSeen     time.Time
	isOffline    bool
	currentProps map[string]interface{}
}

func (s *SidecarSource) ID() string {
	return s.id
}

func (s *SidecarSource) GetRenderConfig() protocol.RenderConfig {
	return s.config
}

func (s *SidecarSource) GetConfigSchema() []protocol.ConfigSchema {
	return s.schema
}

// ApplyConfig stores the merged props so they can be returned to the sidecar via HTTP response.
func (s *SidecarSource) ApplyConfig(props map[string]interface{}) {
	copied := make(map[string]interface{}, len(props))
	for k, v := range props {
		copied[k] = v
	}
	s.currentProps = copied
}

// updateTemplate refreshes the render config and schema when the sidecar sends a new template.
func (s *SidecarSource) updateTemplate(tmpl protocol.RenderConfig, schema []protocol.ConfigSchema) {
	s.config = tmpl
	s.config.ID = s.id
	s.schema = schema
}

// markSeen resets the offline flag and updates the last-seen timestamp.
func (s *SidecarSource) markSeen() {
	s.lastSeen = time.Now()
	s.isOffline = false
}
