package modules

import (
	"glancehud/internal/protocol"
	"time"
)

type NetModule struct {
	prevNetIn  uint64
	prevNetOut uint64
	prevTime   time.Time
}

func NewNetModule() *NetModule {
	return &NetModule{}
}

func (m *NetModule) ID() string {
	return "net"
}

func (m *NetModule) Interval() time.Duration {
	return time.Second // Update every 1s
}

func (m *NetModule) ApplyConfig(props map[string]interface{}) {
	// No config
}

func (m *NetModule) GetRenderConfig() protocol.RenderConfig {
	return protocol.RenderConfig{} // Stub
}

type NetData struct {
	Up   float64 `json:"up"`   // KB/s
	Down float64 `json:"down"` // KB/s
}

func (m *NetModule) Update() (*protocol.DataPayload, error) {
	return &protocol.DataPayload{}, nil // Stub
}
