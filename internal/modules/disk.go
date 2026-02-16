package modules

import (
	"fmt"
	"glancehud/internal/protocol"
	"strings"
	"time"

	"github.com/shirou/gopsutil/v4/disk"
)

type DiskModule struct {
	selectedPaths []string // Empty means auto-detect all
	minimalMode   bool
}

func NewDiskModule(path string) *DiskModule {
	return &DiskModule{}
}

func (m *DiskModule) ID() string {
	return "disk"
}

func (m *DiskModule) Interval() time.Duration {
	return 10 * time.Second
}

func (m *DiskModule) ApplyConfig(props map[string]interface{}) {
	// "paths" is a []interface{} from JSON deserialization
	if val, ok := props["paths"].([]interface{}); ok {
		m.selectedPaths = nil
		for _, v := range val {
			if s, ok := v.(string); ok {
				m.selectedPaths = append(m.selectedPaths, s)
			}
		}
	}
	if val, ok := props["minimal_mode"].(bool); ok {
		m.minimalMode = val
	}
}

func (m *DiskModule) GetConfigSchema() []protocol.ConfigSchema {
	options := discoverPartitions()

	// Default: all partition values checked
	defaults := make([]string, 0, len(options))
	for _, o := range options {
		defaults = append(defaults, o.Value)
	}

	return []protocol.ConfigSchema{
		{
			Name:    "paths",
			Label:   "顯示磁碟",
			Type:    protocol.ConfigCheckboxes,
			Default: defaults,
			Options: options,
		},
	}
}

func discoverPartitions() []protocol.SelectOption {
	var options []protocol.SelectOption
	partitions, err := disk.Partitions(false)
	if err != nil {
		return options
	}
	for _, p := range partitions {
		if p.Mountpoint == "" || strings.HasPrefix(p.Mountpoint, "/snap") || strings.HasPrefix(p.Mountpoint, "/loop") {
			continue
		}
		options = append(options, protocol.SelectOption{
			Label: p.Mountpoint,
			Value: p.Mountpoint,
		})
	}
	return options
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
	paths := m.resolvePaths()

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

func (m *DiskModule) resolvePaths() []string {
	if len(m.selectedPaths) > 0 {
		return m.selectedPaths
	}

	// Auto detect all physical partitions
	var paths []string
	partitions, err := disk.Partitions(false)
	if err == nil {
		for _, p := range partitions {
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
	return paths
}
