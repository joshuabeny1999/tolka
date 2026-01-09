package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/joshuabeny1999/tolka/internal/config"
	"github.com/joshuabeny1999/tolka/internal/middleware"
	"github.com/joshuabeny1999/tolka/internal/spa"
	"github.com/joshuabeny1999/tolka/internal/transcription"
	"github.com/joshuabeny1999/tolka/internal/transcription/deepgram"
	"github.com/joshuabeny1999/tolka/internal/ws"
)

//go:embed dist/*
var content embed.FS

func main() {
	cfg := config.Load()

	mux := http.NewServeMux()

	// 1. API & WebSocket
	mux.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Hello from Go Backend!"}`))
	})

	// 2. WebSocket Endpoint
	factory := func() transcription.Service {
		return deepgram.New(cfg.DeepgramAPIKey)
	}

	wsHandler := ws.NewHandler(factory)
	mux.Handle("/ws", wsHandler)

	// 3. Static Assets
	distFS, err := fs.Sub(content, "dist")
	if err != nil {
		log.Fatal("Konnte dist Ordner nicht einbinden:", err)
	}
	spaHandler, err := spa.NewHandler(distFS, cfg.WsToken)
	if err != nil {
		log.Fatal("Could not initialize SPA handler:", err)
	}
	mux.Handle("/", spaHandler)

	// 4. Auth
	protectedMux := middleware.BasicAuth(mux, cfg.AuthUsername, cfg.AuthPassword, cfg.WsToken)

	// 5. Start
	addr := ":" + cfg.Port
	log.Printf("Server läuft auf %s", addr)
	if err := http.ListenAndServe(addr, protectedMux); err != nil {
		log.Fatal(err)
	}
}
