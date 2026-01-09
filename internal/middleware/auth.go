package middleware

import (
	"crypto/subtle"
	"log"
	"net/http"
	"strings"
)

// BasicAuth wraps a handler and enforces HTTP Basic Auth.
// EXCEPT if the request is for /ws and carries a valid token.
func BasicAuth(next http.Handler, username, password, websocketToken string) http.Handler {
	// 1. Check if Auth is disabled (Development Mode)
	if username == "" || password == "" {
		log.Println("Security: Basic Auth is DISABLED (Development Mode)")
		return next
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		if strings.HasPrefix(r.URL.Path, "/ws") {
			token := r.URL.Query().Get("token")
			if subtle.ConstantTimeCompare([]byte(token), []byte(websocketToken)) == 1 {
				next.ServeHTTP(w, r)
				return
			}
		}

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
