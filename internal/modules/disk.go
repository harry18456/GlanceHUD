package modules

import (
	"time"
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
