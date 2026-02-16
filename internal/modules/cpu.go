package modules

import (
	"glancehud/internal/protocol"
	"time"
)

type CPUModule struct{}

func NewCPUModule() *CPUModule {
	return &CPUModule{}
}

func (m *CPUModule) ID() string {
	return "cpu"
}

func (m *CPUModule) Interval() time.Duration {
	return time.Second
}

func (m *CPUModule) ApplyConfig(props map[string]interface{}) {
	// No config
}

func (m *CPUModule) GetRenderConfig() protocol.RenderConfig {
	return protocol.RenderConfig{} // Stub
}

func (m *CPUModule) Update() (*protocol.DataPayload, error) {
	return &protocol.DataPayload{}, nil // Stub
}
