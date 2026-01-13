package mock

import (
	"context"
	"log"
	"strings"
	"sync"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// ScriptLine repräsentiert eine Zeile im Dialog-Skript
type ScriptLine struct {
	Speaker string
	Text    string
}

// Definiertes Gesprächsszenario für den Mock
var conversationScript = []ScriptLine{
	{Speaker: "Speaker 1", Text: "Hallo zusammen, können wir mit dem Daily starten?"},
	{Speaker: "Speaker 2", Text: "Ja, gerne. Ich habe gestern am Mock-Provider gearbeitet."},
	{Speaker: "Speaker 1", Text: "Sehr gut. Funktioniert das Streaming nun stabil?"},
	{Speaker: "Speaker 2", Text: "Soweit ja. Die Latenz ist minimal und die Diarisierung läuft."},
	{Speaker: "Speaker 3", Text: "Ich habe noch das Frontend angepasst. Die Farben stimmen jetzt."},
	{Speaker: "Speaker 1", Text: "Perfekt, dann lass uns das später mergen."},
}

// Provider implementiert transcription.Service
type Provider struct {
	resChan chan transcription.TranscriptResult
	errChan chan error

	// Simulation state
	mu           sync.Mutex
	scriptIdx    int      // Welcher Satz ist dran?
	wordIdx      int      // Welches Wort im Satz sind wir?
	tickCounter  int      // Simuliert Zeitfortschritt basierend auf Audio-Paketen
	currentWords []string // Cache für die Wörter des aktuellen Satzes
}

// New erstellt eine neue Mock-Instanz
func New() *Provider {
	return &Provider{
		resChan: make(chan transcription.TranscriptResult, 100),
		errChan: make(chan error, 10),
	}
}

func (p *Provider) Connect(ctx context.Context) error {
	log.Println("Mock: Connected and ready to simulate conversation")
	return nil
}

// SendAudio treibt die Simulation voran.
// Wir nehmen an, dass diese Funktion ca. alle 250ms vom Client aufgerufen wird.
func (p *Provider) SendAudio(data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// 1. Initialisierung des aktuellen Satzes, falls nötig
	if p.currentWords == nil {
		if p.scriptIdx >= len(conversationScript) {
			p.scriptIdx = 0 // Loop script from beginning
		}
		line := conversationScript[p.scriptIdx]
		p.currentWords = strings.Fields(line.Text)
		p.wordIdx = 0
	}

	// 2. Zeit verlangsamen (Throttle)
	// Wir wollen nicht bei jedem kleinen Audio-Paket ein neues Wort senden,
	// sondern z.B. nur jedes 3. Paket (simuliert Sprechgeschwindigkeit).
	p.tickCounter++
	if p.tickCounter < 3 {
		return nil
	}
	p.tickCounter = 0

	// 3. Simulations-Logik
	currentLine := conversationScript[p.scriptIdx]

	// Wir fügen ein Wort hinzu
	p.wordIdx++

	isEndOfSentence := p.wordIdx >= len(p.currentWords)

	// Konstruiere den aktuellen Text-Stand (Partial)
	partialText := strings.Join(p.currentWords[:p.wordIdx], " ")

	result := transcription.TranscriptResult{
		Speaker:   currentLine.Speaker,
		Text:      partialText, // Bei Partial schicken wir den bisherigen Satzaufbau
		IsPartial: !isEndOfSentence,
	}

	// Wenn der Satz zu Ende ist, senden wir den finalen Text
	if isEndOfSentence {
		// Bei Final senden wir oft nur das Delta oder den ganzen Satz,
		// je nach API-Kontrakt. Hier senden wir den ganzen Satz als Final.
		result.Text = currentLine.Text
		result.IsPartial = false

		// Reset für den nächsten Satz
		p.scriptIdx++
		p.currentWords = nil
		p.wordIdx = 0

		log.Printf("Mock: Sentence finished by %s", currentLine.Speaker)
	}

	// 4. Senden (Non-blocking select um Deadlocks zu vermeiden)
	select {
	case p.resChan <- result:
	default:
		// Wenn der Channel voll ist, droppen wir das Update (Mock-Verhalten)
	}

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

// EmitFakeResult helper remains for manual testing if needed
func (p *Provider) EmitFakeResult(text string) {
	p.resChan <- transcription.TranscriptResult{
		Text:      text,
		IsPartial: false,
		Speaker:   "System",
	}
}
