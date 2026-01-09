package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBasicAuth(t *testing.T) {
	// Ein Dummy-Handler, der einfach "OK" zurückgibt, wenn die Middleware ihn durchlässt
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Success"))
	})

	tests := []struct {
		name          string
		userConfig    string
		passConfig    string
		wsTokenConfig string
		requestPath   string
		requestUser   string
		requestPass   string
		expectStatus  int
	}{
		// --- Gruppe 1: Standard Basic Auth Tests ---
		{
			name:          "Auth Disabled (Dev Mode)",
			userConfig:    "",
			passConfig:    "",
			wsTokenConfig: "",
			requestPath:   "/",
			requestUser:   "",
			requestPass:   "",
			expectStatus:  http.StatusOK,
		},
		{
			name:          "Auth Disabled (Dev Mode)",
			userConfig:    "",
			passConfig:    "",
			wsTokenConfig: "",
			requestPath:   "/",
			requestUser:   "",
			expectStatus:  http.StatusOK,
		},
		{
			name:          "Auth Enabled - No Credentials",
			userConfig:    "admin",
			passConfig:    "secret",
			wsTokenConfig: "awesome-token",
			requestPath:   "/",
			requestUser:   "",
			requestPass:   "",
			expectStatus:  http.StatusUnauthorized,
		},
		{
			name:          "Auth Enabled - Wrong Password",
			userConfig:    "admin",
			passConfig:    "secret",
			wsTokenConfig: "awesome-token",
			requestPath:   "/",
			requestUser:   "admin",
			requestPass:   "wrong",
			expectStatus:  http.StatusUnauthorized,
		},
		{
			name:          "Auth Enabled - Correct Credentials",
			userConfig:    "admin",
			passConfig:    "secret",
			wsTokenConfig: "awesome-token",
			requestPath:   "/",
			requestUser:   "admin",
			requestPass:   "secret",
			expectStatus:  http.StatusOK,
		},

		// --- Gruppe 2: WebSocket Token Bypass (Safari Fix) ---
		{
			name:          "WS Token - Correct Token bypasses Auth",
			userConfig:    "admin",
			passConfig:    "secret123",
			wsTokenConfig: "awesome-token",
			requestPath:   "/ws?token=awesome-token", // Token == passConfig
			requestUser:   "",                        // Kein Basic Auth Header!
			requestPass:   "",
			expectStatus:  http.StatusOK,
		},
		{
			name:          "WS Token - Wrong Token fails",
			userConfig:    "admin",
			passConfig:    "secret123",
			wsTokenConfig: "awesome-token",
			requestPath:   "/ws?token=wrong",
			requestUser:   "",
			requestPass:   "",
			expectStatus:  http.StatusUnauthorized,
		},
		{
			name:          "WS Token - Correct Token but wrong Path (Security Check)",
			userConfig:    "admin",
			passConfig:    "secret123",
			wsTokenConfig: "awesome-token",
			requestPath:   "/api/secrets?token=awesome-token", // Token darf nur bei /ws gehen
			requestUser:   "",
			requestPass:   "",
			expectStatus:  http.StatusUnauthorized,
		},
		{
			name:          "Hybrid - Wrong Token but Valid Basic Auth (Fallback)",
			userConfig:    "admin",
			passConfig:    "secret123",
			wsTokenConfig: "awesome-token",
			requestPath:   "/ws?token=invalid",
			requestUser:   "admin", // Fallback auf normalen Header Login
			requestPass:   "secret123",
			expectStatus:  http.StatusOK,
		},
		{
			name:          "WS Token DEV Mode - Ignore any Token",
			userConfig:    "",
			passConfig:    "",
			wsTokenConfig: "",
			requestPath:   "/ws?token=SomeToken",
			requestUser:   "",
			requestPass:   "",
			expectStatus:  http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Default Pfad setzen, falls leer
			path := tt.requestPath
			if path == "" {
				path = "/"
			}

			// 1. Setup Request
			req := httptest.NewRequest("GET", path, nil)
			if tt.requestUser != "" || tt.requestPass != "" {
				req.SetBasicAuth(tt.requestUser, tt.requestPass)
			}

			// 2. Setup Response Recorder
			rr := httptest.NewRecorder()

			// 3. Create Middleware with config from test case
			handler := BasicAuth(dummyHandler, tt.userConfig, tt.passConfig, tt.wsTokenConfig)

			// 4. Execute
			handler.ServeHTTP(rr, req)

			// 5. Assert
			if status := rr.Code; status != tt.expectStatus {
				t.Errorf("handler returned wrong status code: got %v want %v",
					status, tt.expectStatus)
			}
		})
	}
}
