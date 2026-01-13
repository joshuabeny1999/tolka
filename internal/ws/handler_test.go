package ws

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
	"github.com/joshuabeny1999/tolka/internal/transcription/mock"
)

func TestHandler_EndToEnd(t *testing.T) {
	// 1. Setup Mock
	mockSrv := mock.New()

	// 2. Define Factory
	factory := func() transcription.Service {
		return mockSrv
	}

	// 3. Create Handler
	wsHandler := NewHandler(factory)

	// 4. Start Test Server
	s := httptest.NewServer(wsHandler)
	defer s.Close()

	// WS URL bauen (http -> ws)
	u := "ws" + strings.TrimPrefix(s.URL, "http")

	// 5. Connect WebSocket Client
	ws, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		t.Fatalf("Connection failed: %v", err)
	}
	defer ws.Close()

	// 6. Audio-Pump starten (Simuliert das Mikrofon)
	// Wir nutzen einen Channel, um die Goroutine sauber zu beenden
	done := make(chan struct{})
	defer close(done) // Stoppt die Goroutine am Ende des Tests

	go func() {
		ticker := time.NewTicker(50 * time.Millisecond)
		defer ticker.Stop()

		dummyAudio := []byte{0, 1, 2, 3} // Irgendwelche Bytes

		for {
			select {
			case <-done:
				return // Test beendet
			case <-ticker.C:
				// Wir senden kontinuierlich Audio, damit der Mock "Ticks" sammelt
				if err := ws.WriteMessage(websocket.BinaryMessage, dummyAudio); err != nil {
					// Wenn der Socket zu ist (Test vorbei), brechen wir ab.
					return
				}
			}
		}
	}()

	// 7. Test: Receive Result
	// Setze ein Timeout, damit der Test nicht ewig hängt ("never to end")
	ws.SetReadDeadline(time.Now().Add(2 * time.Second))

	type WSResponse struct {
		Text      string `json:"text"`
		IsPartial bool   `json:"is_partial"`
		Speaker   string `json:"speaker"`
		Error     string `json:"error,omitempty"`
	}

	var resp WSResponse
	// Wir warten hier auf die ERSTE Nachricht vom Mock.
	// Da der Pump läuft, sollte der Mock nach ca. 150ms (3 Ticks) antworten.
	err = ws.ReadJSON(&resp)
	if err != nil {
		t.Fatalf("Failed to read JSON response: %v", err)
	}

	// 8. Assertions
	expectedText := "Hallo"

	if resp.Text != expectedText {
		t.Errorf("Expected text '%s', got '%s'", expectedText, resp.Text)
	}

	// Der Mock sendet Wörter einzeln als Partial
	if !resp.IsPartial {
		t.Errorf("Expected IsPartial to be true for the first word")
	}

	if resp.Speaker != "Speaker 1" {
		t.Errorf("Expected speaker 'Speaker 1', got '%s'", resp.Speaker)
	}
}
