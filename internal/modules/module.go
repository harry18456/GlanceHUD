package modules

import (
	"glancehud/internal/protocol"
	"time"
)

type Module interface {
	ID() string
	GetRenderConfig() protocol.RenderConfig
	Update() (*protocol.DataPayload, error)
	ApplyConfig(props map[string]interface{})
	Interval() time.Duration
}
