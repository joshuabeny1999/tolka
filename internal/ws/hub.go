package ws

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ServiceFactory is a function that returns a new instance of a transcription service.
type ServiceFactory func() transcription.Service

type Hub struct {
	rooms     map[string]*Room
	factories map[string]ServiceFactory
	mu        sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		rooms:     make(map[string]*Room),
		factories: make(map[string]ServiceFactory),
	}
}

func (h *Hub) RegisterProvider(name string, factory ServiceFactory) {
	h.factories[name] = factory
}

// CreateSession generates a secure ID and initializes the room.
func (h *Hub) CreateSession(providerName string) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	factory, ok := h.factories[providerName]
	if !ok {
		return "", fmt.Errorf("provider %s not found", providerName)
	}

	id := generateID()
	room := NewRoom(id, factory())

	// Start the room loop immediately so it's ready for connections
	go room.Run(func() {
		// Cleanup callback: remove room from hub when it dies
		h.mu.Lock()
		delete(h.rooms, id)
		h.mu.Unlock()
		log.Printf("Room %s cleaned up", id)
	})

	h.rooms[id] = room
	return id, nil
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	roomID := r.URL.Query().Get("room")
	role := r.URL.Query().Get("role") // "host" or empty

	if roomID == "" {
		http.Error(w, "Missing room ID", http.StatusBadRequest)
		return
	}

	// 1. Validate Room Existence
	room := h.getRoom(roomID)
	if room == nil {
		http.Error(w, "Room not found or expired", http.StatusNotFound)
		return
	}

	// 2. Host Claim Check
	isHost := (role == "host")
	if isHost {
		if !room.TryClaimHost() {
			http.Error(w, "Host already connected", http.StatusConflict)
			return
		}
	}

	// 3. Upgrade
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS Upgrade failed:", err)
		if isHost {
			room.ReleaseHost()
		}
		return
	}

	client := &Client{
		room:   room,
		conn:   conn,
		send:   make(chan interface{}, 256),
		isHost: isHost,
	}

	client.room.register <- client

	go client.writePump()
	go client.readPump()
}

func (h *Hub) getRoom(id string) *Room {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.rooms[id]
}

// generateID creates a random 16-byte hex string (UUID-like)
func generateID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "fallback-id"
	}
	return hex.EncodeToString(b)
}
