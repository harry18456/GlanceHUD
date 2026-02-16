package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"time"

	"github.com/shirou/gopsutil/v4/net"
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

func (m *NetModule) GetConfigSchema() []protocol.ConfigSchema {
	return []protocol.ConfigSchema{}
}

func (m *NetModule) GetRenderConfig() protocol.RenderConfig {
	return protocol.RenderConfig{
		ID:    "glancehud.core.net",
		Type:  protocol.TypeKeyValue,
		Title: "Network",
		Props: map[string]any{
			"layout": "column",
		},
	}
}

func (m *NetModule) Update() (*protocol.DataPayload, error) {
	netCounters, err := net.IOCounters(false)
	var netUp, netDown float64
	var totalIn, totalOut uint64

	if err == nil && len(netCounters) > 0 {
		now := time.Now()
		totalIn = netCounters[0].BytesRecv
		totalOut = netCounters[0].BytesSent

		if !m.prevTime.IsZero() {
			elapsed := now.Sub(m.prevTime).Seconds()
			if elapsed > 0 {
				netDown = float64(totalIn-m.prevNetIn) / elapsed / 1024
				netUp = float64(totalOut-m.prevNetOut) / elapsed / 1024
			}
		}
		m.prevNetIn = totalIn
		m.prevNetOut = totalOut
		m.prevTime = now
	}

	items := []protocol.KeyValueItem{
		{
			Key:   "UP",
			Value: fmt.Sprintf("%.1f KB/s", netUp),
			Icon:  "ArrowUp",
		},
		{
			Key:   "DOWN",
			Value: fmt.Sprintf("%.1f KB/s", netDown),
			Icon:  "ArrowDown",
		},
	}

	// Minimal mode logic? Net module is key-value by default, so it's already "minimal" enough.
	// But maybe we want just "1.2K / 4.5K" text?
	// For now, key-value is fine.

	return &protocol.DataPayload{
		Items: items,
	}, nil
}
