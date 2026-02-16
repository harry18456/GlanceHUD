package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/disk"
)

type DiskModule struct {
	path        string // Empty means auto-detect all
	minimalMode bool
}

func NewDiskModule(path string) *DiskModule {
	return &DiskModule{
		path:        path,
		minimalMode: false,
	}
}

func (m *DiskModule) ID() string {
	return "disk"
}

func (m *DiskModule) Interval() time.Duration {
	return 10 * time.Second
}

func (m *DiskModule) ApplyConfig(props map[string]interface{}) {
	if val, ok := props["path"].(string); ok {
		m.path = val
	}
	if val, ok := props["minimal_mode"].(bool); ok {
		m.minimalMode = val
	}
}

func (m *DiskModule) GetConfigSchema() []protocol.ConfigSchema {
	return []protocol.ConfigSchema{
		{
			Name:    "path",
			Label:   "磁碟路徑 (留空自動偵測)",
			Type:    protocol.ConfigText,
			Default: "",
		},
		{
			Name:    "minimal_mode",
			Label:   "極簡模式",
			Type:    protocol.ConfigBool,
			Default: false,
		},
	}
}

func (m *DiskModule) GetRenderConfig() protocol.RenderConfig {
	if m.minimalMode {
		return protocol.RenderConfig{
			ID:    "glancehud.core.disk",
			Type:  protocol.TypeKeyValue,
			Title: "Disk",
			Props: map[string]any{
				"layout": "column",
			},
		}
	}
	return protocol.RenderConfig{
		ID:    "glancehud.core.disk",
		Type:  protocol.TypeBarList,
		Title: "Disk Usage",
		Props: map[string]any{
			"headers": []string{"Drive", "Usage", "Details"},
		},
	}
}

func (m *DiskModule) Update() (*protocol.DataPayload, error) {
	var paths []string

	if m.path != "" {
		paths = []string{m.path}
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

	// Minimal Mode Items (KeyValue)
	if m.minimalMode {
		var items []protocol.KeyValueItem
		for _, p := range paths {
			diskStat, err := disk.Usage(p)
			if err != nil {
				continue
			}
			items = append(items, protocol.KeyValueItem{
				Key:   p,
				Value: fmt.Sprintf("%.0f%%", diskStat.UsedPercent),
				Icon:  "HardDrive",
			})
		}
		return &protocol.DataPayload{Items: items}, nil
	}

	// BarList Items
	var items []protocol.BarListItem
	for _, p := range paths {
		diskStat, err := disk.Usage(p)
		if err != nil {
			continue
		}

		total := round(float64(diskStat.Total)/1024/1024/1024, 0)
		used := round(float64(diskStat.Used)/1024/1024/1024, 1)

		items = append(items, protocol.BarListItem{
			Label:   p,
			Percent: round(diskStat.UsedPercent, 1),
			Value:   fmt.Sprintf("%.1f / %.0f GB", used, total),
		})
	}

	return &protocol.DataPayload{Items: items}, nil
}
