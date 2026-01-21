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

	// Host: Initial-Sync lesen (sollte leer sein, da Raum neu)
	var initMsg WSMessage
	hostConn.SetReadDeadline(time.Now().Add(time.Second))
	if err := hostConn.ReadJSON(&initMsg); err != nil {
		t.Fatalf("Host failed to read initial sync: %v", err)
	}

	// 6. Connect Second HOST (Should Fail)
	_, resp, err := websocket.DefaultDialer.Dial(hostURL, nil)
	if err == nil {
		t.Error("Expected error for second host, but got connection")
	}
	if resp != nil && resp.StatusCode != http.StatusConflict {
		t.Errorf("Expected 409 Conflict, got %d", resp.StatusCode)
	}

	// 7. Test Speaker Naming (Host sendet Command)
	// Wir nutzen ClientCommand Struktur direkt, falls sie exportiert ist,
	// oder definieren sie hier lokal für den Test, um JSON zu bauen.
	updateData := map[string]interface{}{
		"type":      "update_speaker",
		"speakerId": "guest-1",
		"name":      "Fritz",
		"position":  90,
	}
	if err := hostConn.WriteJSON(updateData); err != nil {
		t.Fatalf("Host failed to send update command: %v", err)
	}

	// Host muss das Broadcast-Update empfangen (Bestätigung)
	var updateBroadcast WSMessage
	hostConn.SetReadDeadline(time.Now().Add(time.Second))
	if err := hostConn.ReadJSON(&updateBroadcast); err != nil {
		t.Fatalf("Host failed to read broadcast update: %v", err)
	}

	// Payload Check für Host
	payloadMap, ok := updateBroadcast.Payload.(map[string]interface{})
	if !ok {
		t.Fatal("Payload is not a map")
	}
	guestData := payloadMap["guest-1"].(map[string]interface{})
	if guestData["name"] != "Fritz" {
		t.Errorf("Host: Expected name 'Fritz', got %v", guestData["name"])
	}

	// 8. Connect Viewer (Should Succeed)
	viewerURL := wsBase + "?room=" + roomID
	viewerConn, _, err := websocket.DefaultDialer.Dial(viewerURL, nil)
	if err != nil {
		t.Fatalf("Viewer failed to connect: %v", err)
	}
	defer viewerConn.Close()

	// WICHTIG: Viewer muss jetzt AKTIV die Speaker anfordern (Pull-Prinzip)
	// Das simuliert das Verhalten des neuen useSpeakerRegistry Hooks.
	getCmd := map[string]string{
		"type": "get_speakers",
	}
	if err := viewerConn.WriteJSON(getCmd); err != nil {
		t.Fatalf("Viewer failed to send get_speakers: %v", err)
	}

	// Viewer Response lesen
	// Hinweis: Es könnte sein, dass wir ZWEI Nachrichten bekommen (Initial Connect + Get Response).
	// Wir lesen in einer Loop, bis wir die Daten haben oder Timeout.

	foundFritz := false
	deadline := time.Now().Add(2 * time.Second)

	for time.Now().Before(deadline) {
		viewerConn.SetReadDeadline(time.Now().Add(time.Second))
		var viewerMsg WSMessage
		if err := viewerConn.ReadJSON(&viewerMsg); err != nil {
			break // Timeout oder Error
		}

		if viewerMsg.Type == "speaker_update" {
			// Check Payload
			payloadBytes, _ := json.Marshal(viewerMsg.Payload)
			var speakers map[string]SpeakerData
			json.Unmarshal(payloadBytes, &speakers)

			if s, exists := speakers["guest-1"]; exists {
				if s.Name == "Fritz" && s.Position == 90 {
					foundFritz = true
					break // Success!
				}
			}
		}
	}

	if !foundFritz {
		t.Error("Viewer did not receive updated state with 'Fritz' after sending get_speakers")
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
