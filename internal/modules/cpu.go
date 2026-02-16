package modules

import (
	"math"

	"github.com/shirou/gopsutil/v4/cpu"
)

type CPUModule struct{}

func NewCPUModule() *CPUModule {
	return &CPUModule{}
}

func (m *CPUModule) ID() string {
	return "cpu"
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

func round(val float64, n int) float64 {
	pow := math.Pow(10, float64(n))
	return math.Round(val*pow) / pow
}
