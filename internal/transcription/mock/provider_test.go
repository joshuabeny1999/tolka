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
	// We do this in a goroutine to ensure it doesn't block if the channel buffer is full (though buffer is 100)
	go provider.EmitFakeResult(expectedText)

	// Assertion: Read from the result channel
	select {
	case result := <-provider.ResultChan():
		if result.Text != expectedText {
			t.Errorf("Expected text '%s', got '%s'", expectedText, result.Text)
		}
		if result.IsPartial {
			t.Error("Expected IsPartial to be false by default")
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for result from mock provider")
	}
}

func TestProvider_SendAudio(t *testing.T) {
	provider := mock.New()
	expectedText := "Ich höre 15 Bytes... "

	// SendAudio should not panic and return nil error
	err := provider.SendAudio([]byte("fake-audio-data"))
	if err != nil {
		t.Errorf("SendAudio failed: %v", err)
	}

	select {
	case result := <-provider.ResultChan():
		if result.Text != expectedText {
			t.Errorf("Expected text '%s', got '%s'", expectedText, result.Text)
		}
		if !result.IsPartial {
			t.Error("Expected IsPartial to be true")
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for result from mock provider")
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
	// Reading from a closed channel returns the zero value and false immediately
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
