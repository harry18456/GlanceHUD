package modules

import (
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
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

func (m *CPUModule) Update() (*ModuleData, error) {
	cpuPercent, err := cpu.Percent(0, false)
	if err != nil {
		return nil, err
	}

	return &ModuleData{
		ID:    m.ID(),
		Label: "Processor",
		Value: round(cpuPercent[0], 1),
		Icon:  "Cpu",
	}, nil
}
