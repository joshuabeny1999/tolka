package mock_test

import (
	"testing"
	"time"

	"github.com/joshuabeny1999/tolka/internal/transcription"
	"github.com/joshuabeny1999/tolka/internal/transcription/mock"
)

// Compile-time check to ensure MockProvider implements the Service interface.
var _ transcription.Service = (*mock.Provider)(nil)

func TestProvider_EmitFakeResult(t *testing.T) {
	// Setup
	provider := mock.New()
	expectedText := "Test Transcription"

	// Execution: Simulate an incoming transcription result
	go provider.EmitFakeResult(expectedText)

	// Assertion: Read from the result channel
	select {
	case result := <-provider.ResultChan():
		if result.Text != expectedText {
			t.Errorf("Expected text '%s', got '%s'", expectedText, result.Text)
		}
		if result.IsPartial {
			t.Error("Expected IsPartial to be false by default for FakeResult")
		}
		// EmitFakeResult setzt Speaker standardmässig auf "System"
		if result.Speaker != "System" {
			t.Errorf("Expected speaker 'System', got '%s'", result.Speaker)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for result from mock provider")
	}
}

func TestProvider_SendAudio(t *testing.T) {
	provider := mock.New()

	// Das Skript beginnt mit: "Hallo zusammen, können wir mit dem Daily starten?"
	// Das erste Wort ist "Hallo".
	expectedText := "Hallo"
	expectedSpeaker := "Speaker 1"

	// SendAudio hat nun einen Tick-Counter (< 3), um Geschwindigkeit zu simulieren.
	// Wir müssen es also mehrmals aufrufen, um ein Resultat zu erhalten.
	dummyData := []byte("fake-audio-data")

	go func() {
		// Wir senden 3 Pakete, um den internen Counter (0, 1, 2) zu füllen und den Trigger auszulösen.
		for i := 0; i < 3; i++ {
			_ = provider.SendAudio(dummyData)
			time.Sleep(10 * time.Millisecond) // Kurze Pause zur Sicherheit
		}
	}()

	select {
	case result := <-provider.ResultChan():
		if result.Text != expectedText {
			t.Errorf("Expected text '%s', got '%s'", expectedText, result.Text)
		}
		if !result.IsPartial {
			t.Error("Expected IsPartial to be true for the first word")
		}
		if result.Speaker != expectedSpeaker {
			t.Errorf("Expected speaker '%s', got '%s'", expectedSpeaker, result.Speaker)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for result from mock provider. Did the tick counter logic prevent emission?")
	}
}

func TestProvider_Close(t *testing.T) {
	provider := mock.New()

	// Execution
	err := provider.Close()
	if err != nil {
		t.Errorf("Close returned an error: %v", err)
	}

	// Assertion: Verify channels are closed
	select {
	case _, ok := <-provider.ResultChan():
		if ok {
			t.Error("ResultChan should be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timeout: ResultChan was not closed properly")
	}

	select {
	case _, ok := <-provider.ErrorChan():
		if ok {
			t.Error("ErrorChan should be closed")
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("Timeout: ErrorChan was not closed properly")
	}
}
