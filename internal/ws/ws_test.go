package ws

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// 0. Minimal MockService
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

	// --- TEST FLOW START ---

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

	// NEU: Sofort Initial-Sync lesen (Leere Speaker Liste)
	var initMsg WSMessage
	hostConn.SetReadDeadline(time.Now().Add(time.Second))
	if err := hostConn.ReadJSON(&initMsg); err != nil {
		t.Fatalf("Host failed to read initial sync: %v", err)
	}
	if initMsg.Type != "speaker_update" {
		t.Errorf("Expected initial type 'speaker_update', got %s", initMsg.Type)
	}

	// 6. Connect Second HOST (Should Fail)
	_, resp, err := websocket.DefaultDialer.Dial(hostURL, nil)
	if err == nil {
		t.Error("Expected error for second host, but got connection")
	}
	if resp != nil && resp.StatusCode != http.StatusConflict {
		t.Errorf("Expected 409 Conflict, got %d", resp.StatusCode)
	}

	// 7. NEU: Test Speaker Naming (Host sendet Command)
	updateCmd := ClientCommand{
		Type:      "update_speaker",
		SpeakerID: "guest-1",
		Name:      "Fritz",
		Position:  90,
	}
	if err := hostConn.WriteJSON(updateCmd); err != nil {
		t.Fatalf("Host failed to send update command: %v", err)
	}

	// Host muss das Broadcast-Update empfangen
	var updateBroadcast WSMessage
	hostConn.SetReadDeadline(time.Now().Add(time.Second))
	if err := hostConn.ReadJSON(&updateBroadcast); err != nil {
		t.Fatalf("Host failed to read broadcast update: %v", err)
	}

	// Prüfen ob Daten korrekt im Payload sind (via Map Assertion)
	payloadMap, ok := updateBroadcast.Payload.(map[string]interface{})
	if !ok {
		t.Fatal("Payload is not a map")
	}
	// Hinweis: JSON Unmarshal macht aus Zahlen oft float64
	guestData := payloadMap["guest-1"].(map[string]interface{})
	if guestData["name"] != "Fritz" {
		t.Errorf("Expected name 'Fritz', got %v", guestData["name"])
	}

	// 8. Connect Viewer (Should Succeed & receive updated state)
	viewerURL := wsBase + "?room=" + roomID
	viewerConn, _, err := websocket.DefaultDialer.Dial(viewerURL, nil)
	if err != nil {
		t.Fatalf("Viewer failed to connect: %v", err)
	}
	defer viewerConn.Close()

	var viewerInitMsg WSMessage
	viewerConn.SetReadDeadline(time.Now().Add(time.Second))
	if err := viewerConn.ReadJSON(&viewerInitMsg); err != nil {
		t.Fatalf("Viewer failed to read initial sync: %v", err)
	}

	// Prüfen ob Fritz da ist (JSON Roundtrip check)
	// Wir marshaln es kurz zurück zu JSON und dann in unsere Struct, das ist sauberer als Map Casting
	payloadBytes, _ := json.Marshal(viewerInitMsg.Payload)
	var speakers map[string]SpeakerData
	json.Unmarshal(payloadBytes, &speakers)

	if speakers["guest-1"].Name != "Fritz" {
		t.Errorf("Viewer did not receive updated state. Got: %+v", speakers)
	}
	if speakers["guest-1"].Position != 90 {
		t.Errorf("Viewer did not receive correct position. Got: %d", speakers["guest-1"].Position)
	}

	// 9. Cleanup Check (Positive)
	if hub.getRoom(roomID) == nil {
		t.Error("Room should exist while host is connected")
	}

	// 10. Close Hub
	err = hub.CloseSession(roomID)
	if err != nil {
		t.Errorf("CloseSession returned error: %v", err)
	}

	// 11. Verify Cleanup (Async)
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
