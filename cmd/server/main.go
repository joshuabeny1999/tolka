package main

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed dist/*
var content embed.FS

func main() {
	// Sub-Filesystem erstellen, damit "dist" nicht Teil der URL ist
	distFS, _ := fs.Sub(content, "dist")

	// ... dein Router Setup ...
	// Statische Dateien servieren
	http.Handle("/", http.FileServer(http.FS(distFS)))

	http.ListenAndServe(":8080", nil)
}
