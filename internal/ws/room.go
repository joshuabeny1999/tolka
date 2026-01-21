package ws

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

// idleTimeout determines how long a room waits for the first user
// or remains open after the last user leaves.
const idleTimeout = 2 * time.Minute

// SpeakerData stores Name and Position (0-360 Grad)
type SpeakerData struct {
	Name     string `json:"name"`
	Position int    `json:"position"` // 0 = Oben (Standard), 90 = Rechts, etc.
}

// WSMessage is a Wrapper for all WebSocket Messages
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type Room struct {
	ID          string
	clients     map[*Client]bool
	speakers    map[string]SpeakerData
	broadcast   chan interface{}
	register    chan *Client
	unregister  chan *Client
	audioIngest chan []byte
	service     transcription.Service

	// Timer to handle inactivity
	idleTimer *time.Timer

	ctx    context.Context
	cancel context.CancelFunc

	mu      sync.Mutex
	hasHost bool
}

func NewRoom(id string, service transcription.Service) *Room {
	ctx, cancel := context.WithCancel(context.Background())
	return &Room{
		ID:          id,
		clients:     make(map[*Client]bool),
		speakers:    make(map[string]SpeakerData),
		broadcast:   make(chan interface{}),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		audioIngest: make(chan []byte),
		service:     service,

		// Start timer immediately. If no one joins within idleTimeout, room dies.
		idleTimer: time.NewTimer(idleTimeout),

		ctx:    ctx,
		cancel: cancel,
	}
}

func (r *Room) TryClaimHost() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.hasHost {
		return false
	}
	r.hasHost = true
	return true
}

func (r *Room) ReleaseHost() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.hasHost = false
}

func (r *Room) Close() {
	r.cancel()
}

// Run starts the room loop. cleanupFunc is called when room closes.
func (r *Room) Run(cleanupFunc func()) {
	defer func() {
		// Stop the timer to prevent leaks if function exits for other reasons
		r.idleTimer.Stop()
		cleanupFunc()
		r.cancel()
		r.service.Close()
	}()

	if err := r.service.Connect(r.ctx); err != nil {
		log.Printf("Room %s: Service connect failed: %v", r.ID, err)
		return
	}

	go r.processAudio()

	for {
		select {
		case client := <-r.register:
			// Client joined: Stop the idle timer
			if !r.idleTimer.Stop() {
				select {
				case <-r.idleTimer.C:
				default:
				}
			}

			r.clients[client] = true

			r.mu.Lock()
			currentSpeakers := make(map[string]SpeakerData)
			for k, v := range r.speakers {
				currentSpeakers[k] = v
			}
			r.mu.Unlock()

			initMsg := WSMessage{
				Type:    "speaker_update",
				Payload: currentSpeakers,
			}
			client.send <- initMsg

		case client := <-r.unregister:
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.send)
				if client.isHost {
					r.ReleaseHost()
				}

				if len(r.clients) == 0 {
					log.Printf("Room %s is empty. Closing in %v...", r.ID, idleTimeout)
					r.idleTimer.Reset(idleTimeout)
				}
			}

		case result, ok := <-r.service.ResultChan():
			if !ok {
				return
			}
			msg := WSMessage{
				Type:    "transcript",
				Payload: result,
			}
			r.broadcastToClients(msg)

		case _, ok := <-r.service.ErrorChan():
			if !ok {
				return
			}

		case <-r.idleTimer.C:
			log.Printf("Room %s idle timeout reached. Shutting down.", r.ID)
			return

		case <-r.ctx.Done():
			return
		}
	}
}

func (r *Room) UpdateSpeaker(id string, name string, position int) {
	r.mu.Lock()

	// Get existing data or default
	data, exists := r.speakers[id]
	if !exists {
		data = SpeakerData{Position: 0}
	}

	// Only update if name is set
	if name != "" {
		data.Name = name
	}

	data.Position = position

	r.speakers[id] = data
	r.mu.Unlock()

	// Broadcast to ALL clients for sync
	msg := WSMessage{
		Type:    "speaker_update",
		Payload: map[string]SpeakerData{id: data},
	}
	r.broadcastToClients(msg)
}

func (r *Room) processAudio() {
	for {
		select {
		case <-r.ctx.Done():
			return
		case data := <-r.audioIngest:
			if err := r.service.SendAudio(data); err != nil {
				log.Printf("Room %s: SendAudio error: %v", r.ID, err)
			}
		}
	}
}

func (r *Room) broadcastToClients(msg interface{}) {
	for client := range r.clients {
		select {
		case client.send <- msg:
		default:
			close(client.send)
			delete(r.clients, client)
		}
	}
}
