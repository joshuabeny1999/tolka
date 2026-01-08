package ws

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joshuabeny1999/tolka/internal/transcription"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// ServiceFactory is a function that returns a new instance of a transcription service.
type ServiceFactory func() transcription.Service

// Handler holds dependencies for the WebSocket endpoint.
type Handler struct {
	factory ServiceFactory
}

// NewHandler creates a new WebSocket handler with dependencies injected.
func NewHandler(factory ServiceFactory) *Handler {
	return &Handler{
		factory: factory,
	}
}

// ServeHTTP handles the websocket connection.
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WS: Upgrade failed:", err)
		return
	}
	defer conn.Close()

	srv := h.factory()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := srv.Connect(ctx); err != nil {
		log.Printf("WS: Service connect failed: %v", err)
		return
	}
	defer srv.Close()

	done := make(chan struct{})

	go h.readLoop(conn, srv, done)
	h.writeLoop(conn, srv, done)
}

func (h *Handler) readLoop(conn *websocket.Conn, srv transcription.Service, done chan struct{}) {
	defer close(done)
	conn.SetReadLimit(1024 * 1024)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		msgType, payload, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WS: Read error: %v", err)
			}
			break
		}

		if msgType == websocket.BinaryMessage {
			if err := srv.SendAudio(payload); err != nil {
				log.Printf("WS: SendAudio error: %v", err)
				break
			}
		}
	}
}

func (h *Handler) writeLoop(conn *websocket.Conn, srv transcription.Service, done chan struct{}) {
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return

		case result, ok := <-srv.ResultChan():
			if !ok {
				return
			}
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteJSON(result); err != nil {
				log.Printf("WS: WriteJSON error: %v", err)
				return
			}

		case err, ok := <-srv.ErrorChan():
			if !ok {
				return
			}
			log.Printf("WS: Transcriber error: %v", err)

		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
