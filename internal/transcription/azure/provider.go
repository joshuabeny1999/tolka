package azure

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync" // WICHTIG: Sync importieren

	"github.com/Microsoft/cognitive-services-speech-sdk-go/audio"
	"github.com/Microsoft/cognitive-services-speech-sdk-go/common"
	"github.com/Microsoft/cognitive-services-speech-sdk-go/speech"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

type Provider struct {
	subscriptionKey string
	region          string
	recognizer      *speech.SpeechRecognizer
	pushStream      *audio.PushAudioInputStream
	resChan         chan transcription.TranscriptResult
	errChan         chan error

	// NEU: Mutex zum Schutz vor Race Conditions beim Schliessen
	mu       sync.Mutex
	isClosed bool
}

func New(key, region string) *Provider {
	return &Provider{
		subscriptionKey: key,
		region:          region,
		resChan:         make(chan transcription.TranscriptResult, 100),
		errChan:         make(chan error, 10),
		isClosed:        false,
	}
}

func (p *Provider) Connect(ctx context.Context) error {
	// ... (Config Teil bleibt gleich wie bei dir) ...
	config, err := speech.NewSpeechConfigFromSubscription(p.subscriptionKey, p.region)
	if err != nil {
		return err
	}
	config.SetSpeechRecognitionLanguage("de-CH")
	// config.SetProfanity(common.Raw) // Optional

	format, err := audio.GetDefaultInputFormat() // Achtung: Hier auf InputFormat achten (siehe unten)
	if err != nil {
		return err
	}
	p.pushStream, err = audio.CreatePushAudioInputStreamFromFormat(format)
	if err != nil {
		return err
	}
	audioConfig, err := audio.NewAudioConfigFromStreamInput(p.pushStream)
	if err != nil {
		return err
	}

	p.recognizer, err = speech.NewSpeechRecognizerFromConfig(config, audioConfig)
	if err != nil {
		return err
	}

	// --- Event Handler (Jetzt sicher) ---

	// Helper Funktion zum sicheren Senden
	sendResult := func(res transcription.TranscriptResult) {
		p.mu.Lock()
		defer p.mu.Unlock()

		// Wenn bereits geschlossen, nichts mehr senden (verhindert Panic)
		if p.isClosed {
			return
		}

		// Non-blocking send: Falls der Channel voll ist (weil Frontend weg),
		// blockieren wir hier nicht den Azure-Thread.
		select {
		case p.resChan <- res:
		default:
			// Channel voll oder niemand hört zu -> Nachricht verwerfen
		}
	}

	p.recognizer.Recognizing(func(event speech.SpeechRecognitionEventArgs) {
		text := event.Result.Text
		if len(text) > 0 {
			sendResult(transcription.TranscriptResult{
				Text:      text,
				IsPartial: true,
			})
		}
	})

	p.recognizer.Recognized(func(event speech.SpeechRecognitionEventArgs) {
		text := event.Result.Text
		if len(text) > 0 {
			sendResult(transcription.TranscriptResult{
				Text:      text,
				IsPartial: false,
			})
		}
	})

	p.recognizer.Canceled(func(event speech.SpeechRecognitionCanceledEventArgs) {
		// Auch Fehler sicher senden
		p.mu.Lock()
		defer p.mu.Unlock()
		if p.isClosed {
			return
		}

		err := fmt.Errorf("Azure Canceled: %s (Code: %d)", event.ErrorDetails, event.ErrorCode)
		log.Println(err)

		if event.Reason == common.Error {
			select {
			case p.errChan <- err:
			default:
			}
		}
	})

	p.recognizer.SessionStarted(func(event speech.SessionEventArgs) {
		log.Println("Azure: Session started")
	})
	p.recognizer.SessionStopped(func(event speech.SessionEventArgs) {
		log.Println("Azure: Session stopped")
	})

	// Async Start
	p.recognizer.StartContinuousRecognitionAsync()
	return nil
}

// ... SendAudio bleibt gleich ...
func (p *Provider) SendAudio(data []byte) error {
	p.mu.Lock()
	if p.isClosed || p.pushStream == nil {
		p.mu.Unlock()
		return errors.New("stream closed or not initialized")
	}
	p.mu.Unlock()

	// Write blockiert nicht lange, daher okay ausserhalb des Locks
	return p.pushStream.Write(data)
}

func (p *Provider) Close() error {
	p.mu.Lock()
	// 1. Markieren als geschlossen, damit keine Callbacks mehr senden
	p.isClosed = true
	p.mu.Unlock()

	// 2. Azure stoppen
	if p.recognizer != nil {
		// Wir ignorieren Fehler beim Stoppen, da wir eh runterfahren
		_ = p.recognizer.StopContinuousRecognitionAsync()
	}

	// 3. Stream schliessen
	if p.pushStream != nil {
		p.pushStream.Close()
	}

	// WICHTIG: Wir schliessen p.resChan und p.errChan NICHT manuell.
	// Da der "Reader" (dein Websocket Loop) durch den Verbindungsabbruch
	// sowieso beendet wurde, müssen wir die Channels nicht schliessen,
	// um den Reader zu stoppen. Das verhindert den Panic zuverlässig.
	// Der Garbage Collector räumt die Channels später auf.

	log.Println("Azure: Provider closed gracefully")
	return nil
}

func (p *Provider) ResultChan() <-chan transcription.TranscriptResult { return p.resChan }
func (p *Provider) ErrorChan() <-chan error                           { return p.errChan }
