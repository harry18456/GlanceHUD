package main

import (
	"embed"
	"glancehud/internal/service"
	"log"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/icons"
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
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})

	// Inject app instance and start monitoring
	systemService.Start(app)

	// Load config to check initial windowMode
	config := systemService.GetConfig()

	// Create the HUD window — frameless, transparent, always-on-top
	//
	// WORKAROUND for Wails v3 + Windows hit-test bug:
	//
	// Wails v3 alpha.72 creates frameless+transparent windows with the
	// WS_EX_LAYERED extended style (webview_window_windows.go L318-322).
	// On Windows, the hit-testable (clickable) region of a WS_EX_LAYERED
	// window is determined at CreateWindowEx time and is NOT updated by
	// later SetWindowPos/MoveWindow calls. This means if we create the
	// window at 400×300 and the frontend later resizes it to 800×700 via
	// Window.SetSize, only the original 400×300 area responds to mouse
	// events — the rest is click-through.
	//
	// Fix: set the initial size to 4K (3840×2160) so the hit-test region
	// covers any realistic content size. The frontend’s useAutoResize hook
	// immediately shrinks the window to fit the actual content.
	//
	// Hidden=true prevents the oversized window from flashing on screen;
	// the frontend calls Window.Show() after the first resize completes.
	//
	// TODO: upstream fix would be calling SetLayeredWindowAttributes after
	// each resize in webview_window_windows.go.
	hudWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "GlanceHUD",
		Width:  3840, // see WORKAROUND above — must be >= max expected content size
		Height: 2160, // see WORKAROUND above — must be >= max expected content size
		Hidden: true, // shown by frontend after first resize (avoids oversized flash)

		// Disable manual resize — size is driven by content via frontend
		DisableResize: true,

		// Core: frameless + always-on-top
		Frameless:   true,
		AlwaysOnTop: true,

		// Transparent background — both BackgroundType AND BackgroundColour are required!
		BackgroundType:   application.BackgroundTypeTransparent,
		BackgroundColour: application.NewRGBA(0, 0, 0, 0),

		// Click-through: restore from config
		IgnoreMouseEvents: config.WindowMode == "locked",

		// Frontend entry
		URL: "/",

		// Windows-specific: no backdrop effect, pure transparency
		// NOTE: HiddenOnTaskbar uses WS_EX_NOACTIVATE in Wails v3 alpha which
		// prevents the window from receiving focus/input. Omitted until fixed upstream.
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

	// ── System Tray ──
	setupSystemTray(app, hudWindow, systemService)

	err := app.Run()
	if err != nil {
		log.Fatal(err)
	}
}

func setupSystemTray(app *application.App, hudWindow application.Window, systemService *SystemService) {
	tray := app.SystemTray.New()

	// Set tray icon
	if runtime.GOOS == "darwin" {
		tray.SetTemplateIcon(icons.SystrayMacTemplate)
	} else {
		tray.SetIcon(icons.SystrayLight)
		tray.SetDarkModeIcon(icons.SystrayDark)
	}
	tray.SetTooltip("GlanceHUD")

	// Build tray menu
	menu := app.NewMenu()

	config := systemService.GetConfig()

	// Title (disabled info item)
	menu.Add("GlanceHUD v" + Version).SetEnabled(false)
	menu.AddSeparator()

	// Show/Hide HUD
	showItem := menu.AddCheckbox("Show HUD", true)
	showItem.OnClick(func(ctx *application.Context) {
		if ctx.ClickedMenuItem().Checked() {
			hudWindow.Show()
		} else {
			hudWindow.Hide()
		}
	})

	menu.AddSeparator()

	// Lock mode (click-through) and Edit mode — declare both first for cross-references
	lockItem := menu.AddCheckbox("Lock Mode", config.WindowMode == "locked")
	editItem := menu.AddCheckbox("Edit Mode", false)

	lockItem.OnClick(func(ctx *application.Context) {
		locked := ctx.ClickedMenuItem().Checked()
		hudWindow.SetIgnoreMouseEvents(locked)
		mode := "normal"
		if locked {
			// Exit edit mode when locking
			systemService.SetEditMode(false)
			editItem.SetChecked(false)
			mode = "locked"
		}
		_ = systemService.SetWindowMode(mode)
	})

	editItem.OnClick(func(ctx *application.Context) {
		editing := ctx.ClickedMenuItem().Checked()
		if editing {
			// Ensure not in lock mode
			lockItem.SetChecked(false)
			hudWindow.SetIgnoreMouseEvents(false)
			_ = systemService.SetWindowMode("normal")
		}
		systemService.SetEditMode(editing)
	})

	menu.AddSeparator()

	// Opacity submenu
	opacityMenu := menu.AddSubmenu("Opacity")
	opacityLevels := []struct {
		label string
		value float64
	}{
		{"25%", 0.25},
		{"50%", 0.50},
		{"75%", 0.75},
		{"100%", 1.0},
	}

	// Find which opacity level matches current config (closest match)
	for _, level := range opacityLevels {
		lvl := level // capture
		isChecked := false
		// Check approximate match
		diff := config.Opacity - lvl.value
		if diff < 0 {
			diff = -diff
		}
		if diff < 0.05 {
			isChecked = true
		}
		opacityMenu.AddRadio(lvl.label, isChecked).OnClick(func(ctx *application.Context) {
			_ = systemService.UpdateOpacity(lvl.value)
		})
	}

	menu.AddSeparator()

	// Settings
	menu.Add("Settings").OnClick(func(ctx *application.Context) {
		hudWindow.Show()
		app.Event.Emit("open:settings", nil)
	})

	// Quit
	menu.Add("Quit").OnClick(func(ctx *application.Context) {
		app.Quit()
	})

	tray.SetMenu(menu)
	tray.OnClick(func() {
		if hudWindow.IsVisible() {
			hudWindow.Hide()
			showItem.SetChecked(false)
		} else {
			hudWindow.Show()
			showItem.SetChecked(true)
		}
	})
}
