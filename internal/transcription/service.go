package transcription

import (
	"context"
)

type TranscriptResult struct {
	Text      string `json:"text"`
	Speaker   string `json:"speaker,omitempty"` // Vorbereitung für Diarization
	IsPartial bool   `json:"is_partial"`
}

type Service interface {
	// Connect creates connection to the transcription service.
	Connect(ctx context.Context) error

	// SendAudio takes audio chunk and sends it to the transcription service.
	// Should be thread-safe and non-blocking.
	SendAudio(data []byte) error

	// ResultChan returns results asynchrone.
	ResultChan() <-chan TranscriptResult

	// ErrorChan will return errors that happen during streaming.
	// If this channel has any error, the client should assume that the connection is closed.
	ErrorChan() <-chan error

	// Close closes the connection to the transcription service.
	Close() error
}
