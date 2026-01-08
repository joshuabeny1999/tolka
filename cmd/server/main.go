package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"strings"

	"github.com/joshuabeny1999/tolka/internal/config"
)

//go:embed dist/*
var content embed.FS

func main() {
	cfg := config.Load()

	mux := http.NewServeMux()

	// 1. API Endpoints
	mux.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Hello from Go Backend!"}`))
	})

	// 2. Static Assets & SPA Fallback
	distFS, err := fs.Sub(content, "dist")
	if err != nil {
		log.Fatal("Konnte dist Ordner nicht einbinden:", err)
	}

	mux.HandleFunc("/", spaHandler(distFS))

	// 3. Start
	addr := ":" + cfg.Port
	log.Printf("Server läuft auf %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}

// spaHandler checks if a file exists within the given directory, else it serves the index.html
func spaHandler(assets fs.FS) http.HandlerFunc {
	fileServer := http.FileServer(http.FS(assets))

	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		f, err := assets.Open(path)
		if err != nil {
			r.URL.Path = "/"
		} else {
			f.Close()
		}

		fileServer.ServeHTTP(w, r)
	}
}
