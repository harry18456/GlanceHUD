package modules

import "time"

type Module interface {
	ID() string
	Update() (*ModuleData, error)
	ApplyConfig(props map[string]interface{})
	Interval() time.Duration
}

type ModuleData struct {
	ID    string      `json:"id"`
	Label string      `json:"label"`
	Value interface{} `json:"value"`
	Icon  string      `json:"icon"`
}
