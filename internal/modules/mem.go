package modules

import (
	"glancehud/internal/protocol"
	"time"
)

type MemModule struct{}

func NewMemModule() *MemModule {
	return &MemModule{}
}

func (m *MemModule) ID() string {
	return "mem"
}

func (m *MemModule) Interval() time.Duration {
	return 2 * time.Second
}

func (m *MemModule) ApplyConfig(props map[string]interface{}) {
	// No config
}

func (m *MemModule) GetRenderConfig() protocol.RenderConfig {
	return protocol.RenderConfig{} // Stub
}

func (m *MemModule) Update() (*protocol.DataPayload, error) {
	return &protocol.DataPayload{}, nil // Stub
}
