package modules

import (
	"fmt"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/disk"
)

type DiskModule struct {
	Path string // Empty means auto-detect all
}

func NewDiskModule(path string) *DiskModule {
	return &DiskModule{Path: path}
}

func (m *DiskModule) ID() string {
	return "disk"
}

func (m *DiskModule) Interval() time.Duration {
	return 10 * time.Second
}

func (m *DiskModule) ApplyConfig(props map[string]interface{}) {
	if val, ok := props["path"].(string); ok {
		m.Path = val
	}
}

type DiskData struct {
	Path         string  `json:"path"`
	UsagePercent float64 `json:"usagePercent"`
	Used         float64 `json:"used"`
	Total        float64 `json:"total"`
}

func (m *DiskModule) Update() (*ModuleData, error) {
	var paths []string

	if m.Path != "" {
		paths = []string{m.Path}
	} else {
		// Auto detect physical partitions
		partitions, err := disk.Partitions(false)
		if err == nil {
			for _, p := range partitions {
				// Filter loopback, snaps, etc
				if strings.HasPrefix(p.Mountpoint, "/snap") || strings.HasPrefix(p.Mountpoint, "/loop") {
					continue
				}
				if p.Mountpoint == "" {
					continue
				}
				paths = append(paths, p.Mountpoint)
			}
		}

		if len(paths) == 0 {
			paths = []string{"/"} // Fallback
		}
	}

	var diskInfos []DiskData

	for _, p := range paths {
		diskStat, err := disk.Usage(p)
		if err != nil {
			continue
		}

		total := round(float64(diskStat.Total)/1024/1024/1024, 0)
		used := round(float64(diskStat.Used)/1024/1024/1024, 1)

		diskInfos = append(diskInfos, DiskData{
			Path:         p,
			UsagePercent: round(diskStat.UsedPercent, 1),
			Used:         used,
			Total:        total,
		})
	}

	label := "Disks"
	if len(diskInfos) == 1 {
		label = fmt.Sprintf("Disk %s", diskInfos[0].Path)
	}

	return &ModuleData{
		ID:    m.ID(),
		Label: label,
		Value: diskInfos,
		Icon:  "HardDrive",
	}, nil
}
