package modules

import (
	"github.com/shirou/gopsutil/v4/disk"
)

type DiskModule struct {
	Path string
}

func NewDiskModule(path string) *DiskModule {
	if path == "" {
		path = "C:\\" // Default for Windows
	}
	return &DiskModule{Path: path}
}

func (m *DiskModule) ID() string {
	return "disk"
}

type DiskData struct {
	UsagePercent float64 `json:"usagePercent"`
	Used         float64 `json:"used"`
	Total        float64 `json:"total"`
}

func (m *DiskModule) Update() (*ModuleData, error) {
	diskStat, err := disk.Usage(m.Path)
	if err != nil {
		// Fallback to root or just return empty
		diskStat = &disk.UsageStat{}
	}

	total := round(float64(diskStat.Total)/1024/1024/1024, 0)
	used := round(float64(diskStat.Used)/1024/1024/1024, 1)

	return &ModuleData{
		ID:    m.ID(),
		Label: "Disk " + m.Path,
		Value: DiskData{
			UsagePercent: round(diskStat.UsedPercent, 1),
			Used:         used,
			Total:        total,
		},
		Icon: "HardDrive",
	}, nil
}
