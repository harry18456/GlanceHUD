package modules

import (
	"glancehud/internal/protocol"
	"time"
)

type Module interface {
	ID() string
	GetRenderConfig() protocol.RenderConfig
	GetConfigSchema() []protocol.ConfigSchema
	Update() (*protocol.DataPayload, error)
	ApplyConfig(props map[string]interface{})
	Interval() time.Duration
}
