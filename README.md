# Tolka - Bridging the Communication Gap

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![License](https://img.shields.io/badge/License-MIT-green.svg)

**Tolka** (Swedish for *interpret/interpretieren*) is a real-time captioning tool designed to investigate the impact of multi-device interfaces on group conversation dynamics involving hard-of-hearing participants.

This project is part of a **Master's Thesis** in Human-Computer Interaction (HCI).

## 🎯 Research Scope

The study compares two setups for live captioning in mixed-hearing groups:
1.  **Single-Device:** Only the hard-of-hearing participant sees the captions.
2.  **Multi-Device (Tolka):** All participants (including normal-hearing) have access to the transcript via their smartphones.

**Core Research Questions:**
* Does a shared transcript reduce "othering" or stigma?
* How does the availability of captions affect turn-taking and conversation flow?

## 🛠 Tech Stack

The architecture follows the "Majestic Monolith" pattern to ensure easy deployment and low latency.

* **Backend:** Go (Golang)
    * Handles WebSocket connections for real-time audio/text streaming.
    * Serves the frontend static assets (embedded binary).
* **Frontend:** React + TypeScript (Vite)
    * Responsive mobile-first UI for displaying live subtitles.
* **Deployment:** Docker (Multi-stage build)

## 🚀 Getting Started

### Prerequisites
* Docker & Docker Compose
* Go 1.25+ (for local dev)
* Node.js 20+ (for local dev)

### Option A: Run with Docker (Recommended for Preview)
This builds the full container just like in production.

```bash
# Build and run
docker compose up --build
```

The app is now accessible at [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080).

### Option B: Local Development (Hot Reload)

If you want to edit code and see changes immediately:

1. **Start Frontend (Terminal 1):**
```bash
cd frontend
npm install
npm run dev

```

*Note: By default Vite runs on port 5173. You might need to adjust the Go backend to allow CORS or proxy requests if running separately.*
2. **Start Backend (Terminal 2):**
```bash
# From project root
go run cmd/server/main.go

```


## 🏗 Project Structure

```text
tolka/
├── cmd/server/         # Main entry point for the Go application
├── internal/           # Private application logic (Audio processing, WebSocket)
├── frontend/           # React application
├── Dockerfile          # Multi-stage Docker build definition
└── docker-compose.yml  # Local development setup

```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Created by Joshua Beny Hürzeler as part of the Master's Thesis at University of St. Gallen (HSG), 2026.*