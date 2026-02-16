package main

import (
	"math"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
)

// SystemService exposes system stats to the frontend.
type SystemService struct {
	prevNetIn  uint64
	prevNetOut uint64
	prevTime   time.Time
}

// SystemStats holds the system performance metrics.
type SystemStats struct {
	CPUUsage  float64 `json:"cpuUsage"`  // CPU usage percentage (0-100)
	RAMUsage  float64 `json:"ramUsage"`  // RAM usage percentage (0-100)
	RAMTotal  float64 `json:"ramTotal"`  // Total RAM in GB
	RAMUsed   float64 `json:"ramUsed"`   // Used RAM in GB
	DiskUsage float64 `json:"diskUsage"` // Disk usage percentage (0-100)
	DiskTotal float64 `json:"diskTotal"` // Total disk in GB
	DiskUsed  float64 `json:"diskUsed"`  // Used disk in GB
	NetUp     float64 `json:"netUp"`     // Upload speed KB/s
	NetDown   float64 `json:"netDown"`   // Download speed KB/s
}

// GetSystemStats returns current CPU, RAM, disk and network stats.
func (s *SystemService) GetSystemStats() (*SystemStats, error) {
	cpuPercent, err := cpu.Percent(0, false)
	if err != nil {
		return nil, err
	}

	vmStat, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	// Disk: use C:\ on Windows, / on others
	diskStat, err := disk.Usage("C:\\")
	if err != nil {
		// Fallback to root
		diskStat, err = disk.Usage("/")
		if err != nil {
			diskStat = &disk.UsageStat{}
		}
	}

	// Network: calculate speed from delta
	netCounters, err := net.IOCounters(false)
	var netUp, netDown float64
	if err == nil && len(netCounters) > 0 {
		now := time.Now()
		totalIn := netCounters[0].BytesRecv
		totalOut := netCounters[0].BytesSent

		if !s.prevTime.IsZero() {
			elapsed := now.Sub(s.prevTime).Seconds()
			if elapsed > 0 {
				netDown = float64(totalIn-s.prevNetIn) / elapsed / 1024 // KB/s
				netUp = float64(totalOut-s.prevNetOut) / elapsed / 1024 // KB/s
			}
		}
		s.prevNetIn = totalIn
		s.prevNetOut = totalOut
		s.prevTime = now
	}

	return &SystemStats{
		CPUUsage:  round(cpuPercent[0], 1),
		RAMUsage:  round(vmStat.UsedPercent, 1),
		RAMTotal:  round(float64(vmStat.Total)/1024/1024/1024, 1),
		RAMUsed:   round(float64(vmStat.Used)/1024/1024/1024, 1),
		DiskUsage: round(diskStat.UsedPercent, 1),
		DiskTotal: round(float64(diskStat.Total)/1024/1024/1024, 0),
		DiskUsed:  round(float64(diskStat.Used)/1024/1024/1024, 1),
		NetUp:     round(netUp, 1),
		NetDown:   round(netDown, 1),
	}, nil
}

func round(val float64, n int) float64 {
	pow := math.Pow(10, float64(n))
	return math.Round(val*pow) / pow
}
