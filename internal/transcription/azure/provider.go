package azure

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

type Provider struct {
	subscriptionKey string
	region          string

	cmd     *exec.Cmd
	stdin   io.WriteCloser
	resChan chan transcription.TranscriptResult
	errChan chan error

	mu       sync.Mutex
	isClosed bool
}

// JSON Struktur vom Python Worker
type pythonResult struct {
	Text      string `json:"text"`
	IsPartial bool   `json:"is_partial"`
	Speaker   string `json:"speaker"`
}

func getWorkerPath() (string, error) {
	// 1. Check current directory (Production / Docker)
	if _, err := os.Stat("azure_worker.py"); err == nil {
		return "azure_worker.py", nil
	}

	// 2. Check cmd/server/ directory (Local Development from root)
	if _, err := os.Stat(filepath.Join("cmd", "server", "azure_worker.py")); err == nil {
		return filepath.Join("cmd", "server", "azure_worker.py"), nil
	}

	// 3. Optional: Check relative to executable (if built binary runs elsewhere)
	ex, err := os.Executable()
	if err == nil {
		exPath := filepath.Dir(ex)
		if _, err := os.Stat(filepath.Join(exPath, "azure_worker.py")); err == nil {
			return filepath.Join(exPath, "azure_worker.py"), nil
		}
	}

	return "", errors.New("azure_worker.py not found in CWD or cmd/server/")
}

func New(key, region string) *Provider {
	return &Provider{
		subscriptionKey: key,
		region:          region,
		resChan:         make(chan transcription.TranscriptResult, 100),
		errChan:         make(chan error, 10),
	}
}

func (p *Provider) Connect(ctx context.Context) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.isClosed {
		return errors.New("provider is closed")
	}

	scriptPath, err := getWorkerPath()
	if err != nil {
		return fmt.Errorf("azure initialization failed: %w", err)
	}

	log.Printf("Azure: Using Python worker at %s", scriptPath)

	// "-u" flag for unbuffered output is crucial!
	p.cmd = exec.CommandContext(ctx, "python3", "-u", scriptPath, "--key", p.subscriptionKey, "--region", p.region)

	// 2. Pipes verbinden
	p.stdin, err = p.cmd.StdinPipe()
	if err != nil {
		return err
	}

	stdout, err := p.cmd.StdoutPipe()
	if err != nil {
		return err
	}

	// Stderr auch durchleiten für Debugging (landet im Go Log)
	p.cmd.Stderr = os.Stderr

	// 3. Prozess starten
	if err := p.cmd.Start(); err != nil {
		return err
	}
	log.Println("Azure: Python worker started")

	// 4. Lese-Loop in Goroutine starten
	go p.readOutput(stdout)

	return nil
}

func (p *Provider) readOutput(r io.Reader) {
	scanner := bufio.NewScanner(r)

	// Liest Zeile für Zeile (JSON) von Python
	for scanner.Scan() {
		line := scanner.Bytes()

		var res pythonResult
		if err := json.Unmarshal(line, &res); err != nil {
			log.Printf("Azure: Failed to parse JSON from worker: %v", err)
			continue
		}

		// Senden an Frontend
		select {
		case p.resChan <- transcription.TranscriptResult{
			Text:      res.Text,
			IsPartial: res.IsPartial,
			Speaker:   res.Speaker,
		}:
		default:
			// Drop frame if channel full
		}
	}

	if err := scanner.Err(); err != nil {
		log.Printf("Azure: Error reading from worker: %v", err)
		// Optional: Error in errChan senden
	}

	log.Println("Azure: Output reader stopped")
}

func (p *Provider) SendAudio(data []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.isClosed || p.stdin == nil {
		return errors.New("azure worker not active")
	}

	// Audio Bytes direkt an Python Stdin schreiben
	_, err := p.stdin.Write(data)
	return err
}

func (p *Provider) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.isClosed {
		return nil
	}
	p.isClosed = true

	if p.stdin != nil {
		p.stdin.Close()
	}

	if p.cmd != nil {
		p.cmd.Wait()
	}

	log.Println("Azure: Python worker closed")
	return nil
}

func (p *Provider) ResultChan() <-chan transcription.TranscriptResult { return p.resChan }
func (p *Provider) ErrorChan() <-chan error                           { return p.errChan }
