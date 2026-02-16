package modules

import (
	"time"

	"github.com/shirou/gopsutil/v4/mem"
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

type MemData struct {
	UsagePercent float64 `json:"usagePercent"`
	Used         float64 `json:"used"`
	Total        float64 `json:"total"`
}

func (m *MemModule) Update() (*ModuleData, error) {
	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	total := round(float64(vmStat.Total)/1024/1024/1024, 1)
	used := round(float64(vmStat.Used)/1024/1024/1024, 1)

	return &ModuleData{
		ID:    m.ID(),
		Label: "Memory",
		Value: MemData{
			UsagePercent: round(vmStat.UsedPercent, 1),
			Used:         used,
			Total:        total,
		},
		Icon: "MemoryStick",
	}, nil
}
