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
		name         string
		userConfig   string
		passConfig   string
		requestUser  string
		requestPass  string
		expectStatus int
	}{
		{
			name:         "Auth Disabled (Dev Mode)",
			userConfig:   "",
			passConfig:   "",
			requestUser:  "",
			requestPass:  "",
			expectStatus: http.StatusOK,
		},
		{
			name:         "Auth Enabled - No Credentials",
			userConfig:   "admin",
			passConfig:   "secret",
			requestUser:  "",
			requestPass:  "",
			expectStatus: http.StatusUnauthorized,
		},
		{
			name:         "Auth Enabled - Wrong Password",
			userConfig:   "admin",
			passConfig:   "secret",
			requestUser:  "admin",
			requestPass:  "wrong",
			expectStatus: http.StatusUnauthorized,
		},
		{
			name:         "Auth Enabled - Correct Credentials",
			userConfig:   "admin",
			passConfig:   "secret",
			requestUser:  "admin",
			requestPass:  "secret",
			expectStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 1. Setup Request
			req := httptest.NewRequest("GET", "/", nil)
			if tt.requestUser != "" || tt.requestPass != "" {
				req.SetBasicAuth(tt.requestUser, tt.requestPass)
			}

			// 2. Setup Response Recorder
			rr := httptest.NewRecorder()

			// 3. Create Middleware with config from test case
			handler := BasicAuth(dummyHandler, tt.userConfig, tt.passConfig)

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
