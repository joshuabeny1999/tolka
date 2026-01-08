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

	// 3. Create Handler (no config needed anymore)
	wsHandler := NewHandler(factory)

	// 4. Start Test Server
	s := httptest.NewServer(wsHandler)
	defer s.Close()

	u := "ws" + strings.TrimPrefix(s.URL, "http")

	// 5. Connect WebSocket Client
	ws, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		t.Fatalf("Connection failed: %v", err)
	}
	defer ws.Close()

	// 6. Test: Send Audio
	if err := ws.WriteMessage(websocket.BinaryMessage, []byte{1, 2, 3}); err != nil {
		t.Fatalf("Write binary failed: %v", err)
	}

	// 7. Test: Receive Result
	expectedText := "Hello Test World"
	go func() {
		time.Sleep(50 * time.Millisecond)
		mockSrv.EmitFakeResult(expectedText)
	}()

	var result transcription.TranscriptResult
	if err := ws.ReadJSON(&result); err != nil {
		t.Fatalf("ReadJSON failed: %v", err)
	}

	if result.Text != expectedText {
		t.Errorf("Expected text %q, got %q", expectedText, result.Text)
	}
}
