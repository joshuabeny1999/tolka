package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// MockService stub
type MockService struct {
	resultChan chan transcription.TranscriptResult
	errorChan  chan error
}

func (m *MockService) Connect(ctx context.Context) error                 { return nil }
func (m *MockService) Close() error                                      { return nil }
func (m *MockService) SendAudio(data []byte) error                       { return nil }
func (m *MockService) ResultChan() <-chan transcription.TranscriptResult { return m.resultChan }
func (m *MockService) ErrorChan() <-chan error                           { return m.errorChan }

func TestCompleteSessionFlow(t *testing.T) {
	// 1. Setup Hub
	hub := NewHub()
	hub.RegisterProvider("test", func() transcription.Service {
		return &MockService{
			resultChan: make(chan transcription.TranscriptResult),
			errorChan:  make(chan error),
		}
	})

	// 2. Create Session manually (simulating API call)
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
		t.Error("Expected error connecting to non-existent room")
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
		t.Error("Expected error for second host")
	}
	if resp.StatusCode != http.StatusConflict {
		t.Errorf("Expected 409 Conflict, got %d", resp.StatusCode)
	}

	// 7. Connect Viewer (Should Succeed)
	viewerURL := wsBase + "?room=" + roomID
	viewerConn, _, err := websocket.DefaultDialer.Dial(viewerURL, nil)
	if err != nil {
		t.Fatalf("Viewer failed to connect: %v", err)
	}
	viewerConn.Close()

	// 8. Cleanup Check
	// Give time for async cleanup if implemented, or check internal state
	if hub.getRoom(roomID) == nil {
		t.Error("Room should exist while host is connected")
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
