package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// 0. Minimal MockService to satisfy interfaces
type MockService struct {
	resultChan chan transcription.TranscriptResult
	errorChan  chan error
}

func (m *MockService) Connect(ctx context.Context) error                 { return nil }
func (m *MockService) SendAudio(data []byte) error                       { return nil }
func (m *MockService) ResultChan() <-chan transcription.TranscriptResult { return m.resultChan }
func (m *MockService) ErrorChan() <-chan error                           { return m.errorChan }
func (m *MockService) Close() error                                      { return nil }

func TestCompleteSessionFlow(t *testing.T) {
	// 1. Setup Hub
	hub := NewHub()
	hub.RegisterProvider("test", func() transcription.Service {
		return &MockService{
			resultChan: make(chan transcription.TranscriptResult),
			errorChan:  make(chan error),
		}
	})

	// 2. Create Session manually
	roomID, err := hub.CreateSession("test")
	if err != nil {
		t.Fatalf("Failed to create session: %v", err)
	}

	// 3. Start WS Server
	server := httptest.NewServer(hub)
	defer server.Close()
	wsBase := "ws" + strings.TrimPrefix(server.URL, "http")

	// 4. Try connecting to INVALID room
	_, _, err = websocket.DefaultDialer.Dial(wsBase+"?room=wrongID", nil)
	if err == nil {
		t.Error("Expected error connecting to non-existent room, but got nil")
	}

	// 5. Connect HOST to VALID room
	hostURL := wsBase + "?room=" + roomID + "&role=host"
	hostConn, _, err := websocket.DefaultDialer.Dial(hostURL, nil)
	if err != nil {
		t.Fatalf("Host failed to connect: %v", err)
	}
	defer hostConn.Close()

	// 6. Connect Second HOST (Should Fail)
	_, resp, err := websocket.DefaultDialer.Dial(hostURL, nil)
	if err == nil {
		t.Error("Expected error for second host, but got connection")
	}
	// Check specific status code if response is available
	if resp != nil && resp.StatusCode != http.StatusConflict {
		t.Errorf("Expected 409 Conflict, got %d", resp.StatusCode)
	}

	// 7. Connect Viewer (Should Succeed)
	viewerURL := wsBase + "?room=" + roomID
	viewerConn, _, err := websocket.DefaultDialer.Dial(viewerURL, nil)
	if err != nil {
		t.Fatalf("Viewer failed to connect: %v", err)
	}
	viewerConn.Close()

	// 8. Cleanup Check (Positive)
	// The room MUST exist while the host is connected
	if hub.getRoom(roomID) == nil {
		t.Error("Room should exist while host is connected, but getRoom returned nil")
	}

	// 9. Close Hub (Simulate DELETE /api/session)
	err = hub.CloseSession(roomID)
	if err != nil {
		t.Errorf("CloseSession returned error: %v", err)
	}

	// 10. Verify Cleanup (Async)
	// Cleanup happens in a goroutine, so we wait briefly
	success := false
	for i := 0; i < 10; i++ {
		if hub.getRoom(roomID) == nil {
			success = true
			break
		}
		time.Sleep(50 * time.Millisecond)
	}

	if !success {
		t.Error("Room was not removed from hub after CloseSession")
	}
}

func TestIDGeneration(t *testing.T) {
	id1 := generateID()
	id2 := generateID()

	if len(id1) == 0 {
		t.Error("ID should not be empty")
	}
	if id1 == id2 {
		t.Error("IDs should be unique")
	}
}
