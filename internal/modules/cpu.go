package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
)

type CPUModule struct {
	minimalMode bool
}

func NewCPUModule() *CPUModule {
	return &CPUModule{
		minimalMode: false,
	}
}

func (m *CPUModule) ID() string {
	return "cpu"
}

func (m *CPUModule) Interval() time.Duration {
	return time.Second
}

func (m *CPUModule) ApplyConfig(props map[string]interface{}) {
	if val, ok := props["minimal_mode"].(bool); ok {
		m.minimalMode = val
	}
}

func (m *CPUModule) GetConfigSchema() []protocol.ConfigSchema {
	return []protocol.ConfigSchema{}
}

func (m *CPUModule) GetRenderConfig() protocol.RenderConfig {
	if m.minimalMode {
		return protocol.RenderConfig{
			ID:    "glancehud.core.cpu",
			Type:  protocol.TypeKeyValue, // Use KeyValue for text
			Title: "CPU",
			Props: map[string]any{
				"layout": "row",
			},
		}
	}
	return protocol.RenderConfig{
		ID:    "glancehud.core.cpu",
		Type:  protocol.TypeGauge,
		Title: "CPU Use",
		Props: map[string]any{
			"min":   0,
			"max":   100,
			"unit":  "%",
			"color": "text-green-500", // Tailwind color class or hex
		},
	}
}

func (m *CPUModule) Update() (*protocol.DataPayload, error) {
	cpuPercent, err := cpu.Percent(0, false)
	if err != nil {
		return nil, err
	}
	usage := round(cpuPercent[0], 1)

	payload := &protocol.DataPayload{
		Value: usage,
		Label: fmt.Sprintf("%.1f%%", usage),
	}

	// Minimal Mode Payload
	if m.minimalMode {
		payload.Items = []protocol.KeyValueItem{
			{Key: "CPU", Value: fmt.Sprintf("%.1f%%", usage), Icon: "Cpu"},
		}
		return payload, nil
	}

	// Dynamic Prop Override (Alert Color)
	if usage > 90 {
		payload.Props = map[string]any{
			"color": "text-red-500",
		}
	} else {
		payload.Props = map[string]any{
			"color": "text-green-500",
		}
	}

	return payload, nil
}
