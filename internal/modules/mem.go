package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"time"

	"github.com/shirou/gopsutil/v4/mem"
)

type MemModule struct {
	minimalMode bool
}

func NewMemModule() *MemModule {
	return &MemModule{
		minimalMode: false,
	}
}

func (m *MemModule) ID() string {
	return "mem"
}

func (m *MemModule) Interval() time.Duration {
	return 2 * time.Second
}

func (m *MemModule) ApplyConfig(props map[string]interface{}) {
	if val, ok := props["minimal_mode"].(bool); ok {
		m.minimalMode = val
	}
}

func (m *MemModule) GetConfigSchema() []protocol.ConfigSchema {
	return []protocol.ConfigSchema{
		{
			Name:    "minimal_mode",
			Label:   "極簡模式 (純文字)",
			Type:    protocol.ConfigBool,
			Default: false,
		},
	}
}

func (m *MemModule) GetRenderConfig() protocol.RenderConfig {
	if m.minimalMode {
		return protocol.RenderConfig{
			ID:    "glancehud.core.mem",
			Type:  protocol.TypeKeyValue,
			Title: "RAM",
			Props: map[string]any{
				"layout": "row",
			},
		}
	}
	return protocol.RenderConfig{
		ID:    "glancehud.core.mem",
		Type:  protocol.TypeGauge,
		Title: "Memory",
		Props: map[string]any{
			"min":   0,
			"max":   100,
			"unit":  "%",
			"color": "text-blue-500",
		},
	}
}

func (m *MemModule) Update() (*protocol.DataPayload, error) {
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	usage := round(vmStat.UsedPercent, 1)
	usedGB := round(float64(vmStat.Used)/1024/1024/1024, 1)
	totalGB := round(float64(vmStat.Total)/1024/1024/1024, 0)

	payload := &protocol.DataPayload{
		Value: usage,
		Label: fmt.Sprintf("%.1f%%", usage),
	}

	if m.minimalMode {
		payload.Items = []protocol.KeyValueItem{
			{Key: "RAM", Value: fmt.Sprintf("%.1f G", usedGB), Icon: "MemoryStick"},
		}
		return payload, nil
	}

	// Add detail to label or sublabel if protocol supports it
	// For now, Gauge just shows percentage.
	// We can pass extra data in Items if the Gauge component is smart enough to show tooltip?
	// The protocol.DataPayload has 'Items' as 'any'.
	// Let's pass details there.
	payload.Items = map[string]any{
		"used":  fmt.Sprintf("%.1f GB", usedGB),
		"total": fmt.Sprintf("%.0f GB", totalGB),
	}

	return payload, nil
}
