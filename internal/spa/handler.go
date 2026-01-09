package spa

import (
	"io/fs"
	"net/http"
	"strings"
)

// TokenPlaceholder is the string inside index.html that will be replaced.
const TokenPlaceholder = "__WS_TOKEN_PLACEHOLDER__"

// NewHandler creates a handler that manages SPA routing and token injection.
// It serves static assets from the provided file system and injects the runtime configuration into index.html.
func NewHandler(assets fs.FS, wsToken string) (http.Handler, error) {
	// 1. Load index.html into memory once at startup
	indexBytes, err := fs.ReadFile(assets, "index.html")
	if err != nil {
		return nil, err
	}

	// 2. Replace placeholder (Pre-calculation)
	// We do this once at startup to avoid performance penalties on every request.
	indexHTML := strings.Replace(string(indexBytes), TokenPlaceholder, wsToken, 1)
	finalIndexBytes := []byte(indexHTML)

	// Standard file server for all other assets (css, js, images)
	fileServer := http.FileServer(http.FS(assets))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		// Check: Does the file physically exist? (e.g., style.css, logo.png)
		f, err := assets.Open(path)
		if err != nil {
			// Case A: File not found -> SPA Fallback (serve injected index.html)
			// This handles client-side routing (e.g., /dashboard, /settings)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(finalIndexBytes)
			return
		}
		f.Close()

		// Case B: index.html explicitly requested -> Serve injected version
		if path == "index.html" || path == "" {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(finalIndexBytes)
			return
		}

		// Case C: Static Asset found -> Serve normally
		fileServer.ServeHTTP(w, r)
	}), nil
}
