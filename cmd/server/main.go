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

	// Dummy API endpoint returning hello
	http.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello World!"))
	})

	http.ListenAndServe(":8080", nil)
}
