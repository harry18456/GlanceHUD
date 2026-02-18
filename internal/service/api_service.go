package service

import (
	"encoding/json"
	"fmt"
	"glancehud/internal/protocol"
	"net/http"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type APIService struct {
	app           *application.App
	systemService *SystemService
}

func NewAPIService(s *SystemService) *APIService {
	return &APIService{
		systemService: s,
	}
}

func (s *APIService) Start(app *application.App) {
	s.app = app
	go s.startHTTPServer()
}

func (s *APIService) startHTTPServer() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/widget", s.handleWidgetPush)
	mux.HandleFunc("/api/stats", s.handleStatsPull)

	// TODO: Make port configurable
	addr := ":9090"
	fmt.Printf("[APIService] Listening on %s\n", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Printf("[APIService] Error starting server: %v\n", err)
	}
}

func (s *APIService) handleWidgetPush(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req protocol.SidecarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate (Namespace check etc.)
	if req.ModuleID == "" {
		http.Error(w, "module_id required", http.StatusBadRequest)
		return
	}

	// Lazy Registration / Ensure Existence
	// This creates the module in RAM if missing, and updates config if Template is provided
	s.systemService.RegisterSidecar(req.ModuleID, req.Template, nil)

	// Update Data
	if req.Data != nil {
		s.systemService.UpdateSidecarData(req.ModuleID, req.Data)
	}

	// NOTE: We don't emit "widget:update" anymore because SystemService.UpdateSidecarData emits "stats:update"
	// and creates uniformity with native modules.
	// However, frontend currently listens to BOTH "stats:update" and "widget:update".
	// "widget:update" was a temporary hack in Phase 3.
	// We should unify everything to "stats:update".

	// fmt.Printf("[API] Pushed data for %s\n", req.ModuleID)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (s *APIService) handleStatsPull(w http.ResponseWriter, r *http.Request) {
	// Phase 4: Implementation later
	w.WriteHeader(http.StatusNotImplemented)
}
