package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
)

type ClientCommand struct {
	Type      string `json:"type"`
	SpeakerID string `json:"speakerId"`
	Name      string `json:"name"`
	Position  int    `json:"position"`
}

type Client struct {
	room   *Room
	conn   *websocket.Conn
	send   chan interface{}
	isHost bool
}

func (c *Client) readPump() {
	defer func() {
		c.room.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(1024 * 1024)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		msgType, payload, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WS read error: %v", err)
			}
			break
		}

		// 1. Audio Daten (Binary) - Nur Host darf Audio senden
		if c.isHost && msgType == websocket.BinaryMessage {
			select {
			case c.room.audioIngest <- payload:
			default:
			}
		}

		// 2. Steuerbefehle (Text/JSON) - z.B. Host benennt Speaker um
		if msgType == websocket.TextMessage {
			var cmd ClientCommand
			if err := json.Unmarshal(payload, &cmd); err == nil {
				if cmd.Type == "update_speaker" && c.isHost {
					c.room.UpdateSpeaker(cmd.SpeakerID, cmd.Name, cmd.Position)
				}
				if cmd.Type == "get_speakers" {
					c.room.SendCurrentSpeakers(c)
				}
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
