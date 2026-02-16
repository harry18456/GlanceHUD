package main

import (
	"embed"
	"glancehud/internal/service"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// custom service
	systemService := NewSystemService()

	app := application.New(application.Options{
		Name:        "GlanceHUD",
		Description: "Lightweight system-vitals floating HUD",
		Services: []application.Service{
			application.NewService(systemService),
			application.NewService(service.NewAPIService()),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Inject app instance and start monitoring
	systemService.Start(app)

	// Create the HUD window — frameless, transparent, always-on-top
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "GlanceHUD",
		Width:     400,
		Height:    460,
		MinWidth:  300,
		MinHeight: 200,

		// Core: frameless + always-on-top
		Frameless:   true,
		AlwaysOnTop: true,

		// Transparent background — both BackgroundType AND BackgroundColour are required!
		BackgroundType:   application.BackgroundTypeTransparent,
		BackgroundColour: application.NewRGBA(0, 0, 0, 0),

		// Frontend entry
		URL: "/",

		// Windows-specific: no backdrop effect, pure transparency via RGBA(0,0,0,0)
		Windows: application.WindowsWindow{
			BackdropType: application.None,
		},

		// macOS-specific
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	})

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
