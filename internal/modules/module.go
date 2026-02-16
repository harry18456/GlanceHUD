package modules

// ModuleData represents the data returned by a module update.
type ModuleData struct {
	ID    string      `json:"id"`
	Label string      `json:"label"`
	Value interface{} `json:"value"` // Generic value (string, number, struct)
	Icon  string      `json:"icon"`  // Lucide icon name, optional
}

// Module interface for all data sources.
type Module interface {
	ID() string
	Update() (*ModuleData, error)
}
