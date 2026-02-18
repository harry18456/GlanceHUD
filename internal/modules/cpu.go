package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
)

type CPUModule struct {
	minimalMode    bool
	alertThreshold float64
}

func NewCPUModule() *CPUModule {
	return &CPUModule{
		minimalMode:    false,
		alertThreshold: 80,
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
	if val, ok := props["alert_threshold"].(float64); ok {
		m.alertThreshold = val
	}
}

func (m *CPUModule) GetConfigSchema() []protocol.ConfigSchema {
	return []protocol.ConfigSchema{
		{
			Name:    "alert_threshold",
			Label:   "Alert Threshold (%)",
			Type:    protocol.ConfigNumber,
			Default: 80,
		},
	}
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
		Type:  protocol.TypeSpark,
		Title: "CPU",
		Props: map[string]any{
			"unit":      "%",
			"maxPoints": 60, // 60s of history at 1s interval
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
	}

	// Alert: turn sparkline red when usage exceeds threshold
	if usage > m.alertThreshold {
		payload.Props = map[string]any{
			"color": "#ef4444",
		}
	}

	// Minimal mode: key-value list
	if m.minimalMode {
		payload.Items = []protocol.KeyValueItem{
			{Key: "CPU", Value: fmt.Sprintf("%.1f%%", usage), Icon: "Cpu"},
		}
	}

	return payload, nil
}
