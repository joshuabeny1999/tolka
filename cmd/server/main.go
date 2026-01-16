package main

import (
	"embed"
	"encoding/json"
	"io/fs"
	"log"
	"net/http"

	"github.com/joshuabeny1999/tolka/internal/config"
	"github.com/joshuabeny1999/tolka/internal/middleware"
	"github.com/joshuabeny1999/tolka/internal/spa"
	"github.com/joshuabeny1999/tolka/internal/transcription"
	"github.com/joshuabeny1999/tolka/internal/transcription/azure"
	"github.com/joshuabeny1999/tolka/internal/transcription/deepgram"
	"github.com/joshuabeny1999/tolka/internal/transcription/mock"
	"github.com/joshuabeny1999/tolka/internal/ws"
)

//go:embed dist/*
var content embed.FS

func main() {
	cfg := config.Load()

	mux := http.NewServeMux()

	// 1. API Helper
	mux.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Hello from Go Backend!"}`))
	})

	// 2. WebSocket Hub
	hub := ws.NewHub()

	// Register Factories
	hub.RegisterProvider("azure", func() transcription.Service {
		return azure.New(cfg.AzureAPIKey, cfg.AzureRegion)
	})
	hub.RegisterProvider("deepgram", func() transcription.Service {
		return deepgram.New(cfg.DeepgramAPIKey)
	})
	hub.RegisterProvider("mock", func() transcription.Service {
		return mock.New()
	})

	// 3. API: Create Session
	// POST /api/session?provider=mock
	mux.HandleFunc("/api/session", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {

			provider := r.URL.Query().Get("provider")
			if provider == "" {
				provider = "mock" // default
			}

			id, err := hub.CreateSession(provider)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]string{
				"roomId": id,
				"status": "created",
			})
			return
		}

		if r.Method == http.MethodDelete {
			roomID := r.URL.Query().Get("room")
			if roomID == "" {
				http.Error(w, "Missing room ID", http.StatusBadRequest)
				return
			}

			if err := hub.CloseSession(roomID); err != nil {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Room closed"))
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// 4. WebSocket Endpoint
	mux.Handle("/ws/connect", hub)

	// 5. Static Assets
	distFS, err := fs.Sub(content, "dist")
	if err != nil {
		log.Fatal("Konnte dist Ordner nicht einbinden:", err)
	}
	spaHandler, err := spa.NewHandler(distFS, cfg.WsToken)
	if err != nil {
		log.Fatal("Could not initialize SPA handler:", err)
	}
	// Alles was nicht /api oder /ws ist, geht an die SPA
	mux.Handle("/", spaHandler)

	// 5. Auth
	protectedMux := middleware.BasicAuth(mux, cfg.AuthUsername, cfg.AuthPassword, cfg.WsToken)

	// 6. Start
	addr := ":" + cfg.Port
	log.Printf("Server läuft auf %s", addr)
	if err := http.ListenAndServe(addr, protectedMux); err != nil {
		log.Fatal(err)
	}
}
