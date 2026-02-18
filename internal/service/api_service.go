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

	// Bind to localhost only to prevent exposure to other network interfaces
	addr := "127.0.0.1:9090"
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

	// Lazy registration: create in RAM if new, update template/schema if provided
	s.systemService.RegisterSidecar(req.ModuleID, req.Template, req.Schema)

	// Update data and capture current props to return to sidecar
	var currentProps map[string]interface{}
	if req.Data != nil {
		currentProps = s.systemService.UpdateSidecarData(req.ModuleID, req.Data)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(protocol.SidecarResponse{
		Status: "ok",
		Props:  currentProps,
	}); err != nil {
		fmt.Printf("[APIService] Failed to encode response for %s: %v\n", req.ModuleID, err)
	}
}

func (s *APIService) handleStatsPull(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	filterID := r.URL.Query().Get("id")
	resp := s.systemService.GetStats(filterID)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		fmt.Printf("[APIService] Failed to encode stats response: %v\n", err)
	}
}
