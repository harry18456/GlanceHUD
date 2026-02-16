package modules

import (
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

type NetData struct {
	Up   float64 `json:"up"`   // KB/s
	Down float64 `json:"down"` // KB/s
}

func (m *NetModule) Update() (*ModuleData, error) {
	netCounters, err := net.IOCounters(false)
	var netUp, netDown float64

	if err == nil && len(netCounters) > 0 {
		now := time.Now()
		totalIn := netCounters[0].BytesRecv
		totalOut := netCounters[0].BytesSent

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

	return &ModuleData{
		ID:    m.ID(),
		Label: "Network",
		Value: NetData{
			Up:   round(netUp, 1),
			Down: round(netDown, 1),
		},
		Icon: "ArrowUpDown",
	}, nil
}
