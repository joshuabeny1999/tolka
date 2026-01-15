package ws

import (
	"context"
	"log"
	"sync"

	"github.com/joshuabeny1999/tolka/internal/transcription"
)

type Room struct {
	ID          string
	clients     map[*Client]bool
	broadcast   chan interface{}
	register    chan *Client
	unregister  chan *Client
	audioIngest chan []byte
	service     transcription.Service

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
		broadcast:   make(chan interface{}),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
		audioIngest: make(chan []byte),
		service:     service,
		ctx:         ctx,
		cancel:      cancel,
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

// Run starts the room loop. cleanupFunc is called when room closes.
func (r *Room) Run(cleanupFunc func()) {
	defer func() {
		cleanupFunc()
		r.cancel()
		r.service.Close()
	}()

	// Auto-close room after 1 hour or if empty for too long (logic can be added here)
	// For now, we rely on context cancellation or manual implementation.

	if err := r.service.Connect(r.ctx); err != nil {
		log.Printf("Room %s: Service connect failed: %v", r.ID, err)
		return
	}

	go r.processAudio()

	for {
		select {
		case client := <-r.register:
			r.clients[client] = true

		case client := <-r.unregister:
			if _, ok := r.clients[client]; ok {
				delete(r.clients, client)
				close(client.send)
				if client.isHost {
					r.ReleaseHost()
				}
			}
			// If needed: Close room if no clients left
			// if len(r.clients) == 0 { return }

		case result, ok := <-r.service.ResultChan():
			if !ok {
				return
			}
			r.broadcastToClients(result)

		case _, ok := <-r.service.ErrorChan():
			if !ok {
				return
			}
			// log error but keep running

		case <-r.ctx.Done():
			return
		}
	}
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
