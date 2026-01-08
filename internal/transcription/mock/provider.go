package mock

import (
	"context"
	"log"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// Provider implementiert transcription.Service
type Provider struct {
	resChan chan transcription.TranscriptResult
	errChan chan error
}

// New erstellt eine neue Mock-Instanz
func New() *Provider {
	return &Provider{
		resChan: make(chan transcription.TranscriptResult, 100),
		errChan: make(chan error, 10),
	}
}

func (p *Provider) Connect(ctx context.Context) error {
	log.Println("Mock: Connected")
	return nil
}

func (p *Provider) SendAudio(data []byte) error {
	log.Printf("Mock: Received %d bytes audio", len(data))
	return nil
}

func (p *Provider) ResultChan() <-chan transcription.TranscriptResult {
	return p.resChan
}

func (p *Provider) ErrorChan() <-chan error {
	return p.errChan
}

func (p *Provider) Close() error {
	log.Println("Mock: Closed")
	close(p.resChan)
	close(p.errChan)
	return nil
}

// EmitFakeResult is a helper function for testing
func (p *Provider) EmitFakeResult(text string) {
	p.resChan <- transcription.TranscriptResult{
		Text:      text,
		IsPartial: false,
	}
}
