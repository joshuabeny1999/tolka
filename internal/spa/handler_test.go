package spa

import (
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestNewHandler(t *testing.T) {
	// 1. Setup Fake Filesystem
	mockFS := fstest.MapFS{
		"index.html": {Data: []byte("<html><script>const t = '__WS_TOKEN_PLACEHOLDER__';</script></html>")},
		"style.css":  {Data: []byte("body { color: red; }")},
	}

	token := "SECRET_TOKEN_123"

	// 2. Init Handler
	handler, err := NewHandler(mockFS, token)
	if err != nil {
		t.Fatalf("NewHandler returned error: %v", err)
	}

	// --- Test Case A: Index.html (Injection) ---
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp := w.Result()
	body, _ := io.ReadAll(resp.Body)
	stringBody := string(body)

	if !strings.Contains(stringBody, token) {
		t.Errorf("Expected token %q in index.html, got body: %s", token, stringBody)
	}
	if strings.Contains(stringBody, TokenPlaceholder) {
		t.Error("Placeholder was not replaced")
	}

	// --- Test Case B: SPA Fallback (Non-existent route) ---
	req = httptest.NewRequest("GET", "/dashboard/settings", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp = w.Result()
	body, _ = io.ReadAll(resp.Body)
	stringBody = string(body)

	// Should also be index.html (due to SPA Routing)
	if !strings.Contains(stringBody, token) {
		t.Error("SPA fallback did not serve injected index.html")
	}

	// --- Test Case C: Static Asset (CSS) ---
	req = httptest.NewRequest("GET", "/style.css", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	resp = w.Result()
	body, _ = io.ReadAll(resp.Body)

	if string(body) != "body { color: red; }" {
		t.Errorf("Static asset content mismatch. Got: %s", string(body))
	}
}
