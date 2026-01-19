package deepgram

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"

	// Import SDK v3 based on your snippet
	api "github.com/deepgram/deepgram-go-sdk/v3/pkg/api/listen/v1/websocket/interfaces"
	interfaces "github.com/deepgram/deepgram-go-sdk/v3/pkg/client/interfaces"
	client "github.com/deepgram/deepgram-go-sdk/v3/pkg/client/listen"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

func init() {
	client.InitWithDefault()
}

type Provider struct {
	apiKey      string
	dgClient    *client.WSCallback
	resChan     chan transcription.TranscriptResult
	errChan     chan error
	inputWriter *io.PipeWriter // We write audio chunks here
}

// New creates a new Deepgram provider instance
func New(apiKey string) *Provider {
	return &Provider{
		apiKey:  apiKey,
		resChan: make(chan transcription.TranscriptResult, 100),
		errChan: make(chan error, 10),
	}
}

func (p *Provider) Connect(ctx context.Context) error {
	// 1. Setup Options (Swiss German, Nova-3, Interim)
	options := &interfaces.LiveTranscriptionOptions{
		Model:          "nova-3",
		Language:       "de-ch",
		SmartFormat:    true,
		InterimResults: true,
		Endpointing:    "500",
		UtteranceEndMs: "1000",
		Diarize:        true,
		// Diarization: true, // Uncomment later when needed
	}

	// 2. Create Callback to handle incoming messages
	// We pass 'p' (the provider) to the callback so it can push to resChan
	callback := &deepgramCallback{provider: p}

	// 3. Initialize Client
	dgClient, err := client.NewWSUsingCallback(ctx, p.apiKey, &interfaces.ClientOptions{}, options, callback)
	if err != nil {
		return err
	}
	p.dgClient = dgClient

	// 4. Establish Connection
	if !p.dgClient.Connect() {
		return context.DeadlineExceeded // Or custom error
	}

	// 5. Setup Audio Pipe (The Bridge between SendAudio and Deepgram)
	// We create a pipe. We write to 'pw', Deepgram reads from 'pr'.
	pr, pw := io.Pipe()
	p.inputWriter = pw

	// 6. Start Streaming in a background goroutine
	// Deepgram's Stream() blocks until the stream is closed, so we must run it async.
	go func() {
		// Buffer the reader for better performance
		p.dgClient.Stream(bufio.NewReader(pr))
		// When Stream returns, the connection is done.
	}()

	log.Println("Deepgram: Connected and streaming started")
	return nil
}

func (p *Provider) SendAudio(data []byte) error {
	if p.inputWriter == nil {
		return nil // Or error "not connected"
	}
	// Write chunk into the pipe. Deepgram reads it on the other side.
	if len(data) == 0 {
		return nil
	}
	_, err := p.inputWriter.Write(data)
	return err
}

func (p *Provider) ResultChan() <-chan transcription.TranscriptResult {
	return p.resChan
}

func (p *Provider) ErrorChan() <-chan error {
	return p.errChan
}

func (p *Provider) Close() error {
	// Closing the pipe writer signals EOF to Deepgram's Stream() method.
	if p.inputWriter != nil {
		p.inputWriter.Close()
	}
	if p.dgClient != nil {
		p.dgClient.Stop()
	}
	close(p.resChan)
	close(p.errChan)
	log.Println("Deepgram: Connection closed")
	return nil
}

// --- Callback Implementation ---

type deepgramCallback struct {
	provider *Provider
}

// getDominantSpeaker is a helper function and returns the speaker label with the highest number of words
func getDominantSpeaker(words []api.Word) string {
	if len(words) == 0 {
		return "Unknown"
	}

	counts := make(map[int]int)
	for _, w := range words {
		counts[*w.Speaker]++
	}

	maxCount := -1
	dominantSpeakerID := -1

	for speakerID, count := range counts {
		if count > maxCount {
			maxCount = count
			dominantSpeakerID = speakerID
		}
	}

	if dominantSpeakerID == -1 {
		return "Unknown"
	}

	return fmt.Sprintf("Speaker %d", dominantSpeakerID)
}

// Message is called when Deepgram sends a transcript
func (c *deepgramCallback) Message(mr *api.MessageResponse) error {
	if len(mr.Channel.Alternatives) == 0 {
		return nil
	}

	alternative := mr.Channel.Alternatives[0]
	transcript := strings.TrimSpace(alternative.Transcript)

	if len(transcript) == 0 {
		return nil
	}

	speakerLabel := getDominantSpeaker(alternative.Words)

	result := transcription.TranscriptResult{
		Text:      transcript,
		IsPartial: !mr.IsFinal,
		Speaker:   speakerLabel,
	}

	select {
	case c.provider.resChan <- result:
	default:
		log.Println("Deepgram: Warning - Result channel full")
	}

	return nil
}

// Boilerplate implementation for other required interface methods

func (c *deepgramCallback) Open(r *api.OpenResponse) error         { return nil }
func (c *deepgramCallback) Metadata(r *api.MetadataResponse) error { return nil }
func (c *deepgramCallback) Close(r *api.CloseResponse) error       { return nil }
func (c *deepgramCallback) Error(r *api.ErrorResponse) error {
	// Push error to the main app
	select {
	case c.provider.errChan <- errors.New(r.ErrMsg + ": " + r.ErrCode):
	default:
	}
	return nil
}
func (c *deepgramCallback) UnhandledEvent([]byte) error                    { return nil }
func (c *deepgramCallback) SpeechStarted(*api.SpeechStartedResponse) error { return nil }
func (c *deepgramCallback) UtteranceEnd(*api.UtteranceEndResponse) error   { return nil }
