package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"
)

// BasicAuth wraps a handler and enforces HTTP Basic Auth ONLY if username and password are set.
func BasicAuth(next http.Handler, username, password string) http.Handler {
	// 1. Check if Auth is disabled (Development Mode)
	if username == "" || password == "" {
		log.Println("Security: Basic Auth is DISABLED (Development Mode)")
		return next
	}

	// 2. Return the Auth Handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()

		if !ok ||
			subtle.ConstantTimeCompare([]byte(user), []byte(username)) != 1 ||
			subtle.ConstantTimeCompare([]byte(pass), []byte(password)) != 1 {

			w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
