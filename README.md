# Tolka - Bridging the Communication Gap

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Azure Speech](https://img.shields.io/badge/Azure-Speech-0078D4?style=flat&logo=microsoftazure)
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

The architecture follows a hybrid approach to combine Go's performance with Python's rich AI ecosystem.

* **Backend:** Go (Golang)
    * Orchestrates WebSocket connections and serves the application.
    * Manages authentication and static assets.
* **AI Worker:** Python
    * Runs as a sidecar process managed by Go.
    * Uses **Microsoft Azure Speech SDK** for Python to enable **Speaker Diarization** (not supported in Go SDK).
    * Streams audio via standard I/O pipes for minimal latency (<1ms overhead).
* **Frontend:** React + TypeScript (Vite)
    * Responsive mobile-first UI for displaying live subtitles.
* **Deployment:** Docker (Multi-stage build)
    * Single container including Go binary and Python runtime.

## 🚀 Getting Started

### Prerequisites
* Docker & Docker Compose
* Go 1.25+ (for local dev)
* Node.js 20+ (for local dev)
* Python 3.11+ (for local dev)

### 0. Configuration (Required)
Before running the app, you need to set up the environment variables.

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and configure the Azure Speech Service:
```env
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=switzerlandnorth

```

### Option A: Run with Docker (Recommended for Preview/Production)

This builds the full container just like in production (Go + Python environment).

```bash
# Build and run
docker compose up --build

```

The app is accessible at [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080).

### Option B: Local Development (Hot Reload)
For the best developer experience, we use a `Makefile` that automates the project setup. However, you must ensure the core runtime tools are installed on your machine first.

#### 1. System Requirements (Prerequisites)

Please ensure the following tools are installed and available in your terminal's `PATH`:

* **[Go 1.25+](https://go.dev/dl/)**: Required to run the backend and tools.
* **[Node.js 20+ & npm](https://nodejs.org/en/download/)**: Required for the React frontend.
* **[Python 3.11+](https://www.python.org/downloads/)**: Required for the Azure AI worker (Diarization).
* **Make**: Typically pre-installed on macOS/Linux (via Xcode/build-essential).

#### 2. Start Development Server

Once the tools above are installed, you can simply run the make command. It will automatically:
1.  Create the Python `venv` and install Azure SDK requirements.
2.  Install `air` (Go hot reload) if missing.
3.  Install Frontend dependencies (`npm install`).
4.  Start Backend and Frontend concurrently.
```bash
make dev
```

* **Frontend:** Open [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173) (Proxies API requests to backend automatically)
* **Backend:** Runs on port `8080` (rebuilds automatically on save)

## 🏗 Project Structure

```text
tolka/
├── cmd/server/
│   ├── main.go             # Main entry point for Go
│   └── azure_worker.py     # Python script for Azure Diarization
├── internal/               # Application logic (Audio processing, WebSocket)
├── frontend/               # React application
├── requirements.txt        # Python dependencies
├── Makefile                # Dev automation
├── Dockerfile              # Multi-stage Docker build
└── docker-compose.yml      # Local development setup

```

## 🔒 Authentication

To protect the application from unauthorized access (and unexpected API costs), Tolka supports optional **HTTP Basic Auth**.

* **Development:** If `AUTH_USERNAME` or `AUTH_PASSWORD` are empty, authentication is **disabled**.
* **Production:** Set the variables to enforce login for the entire application.

```env
# Basic Auth Credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=secure_password
WS_TOKEN=secure_token

```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Created by Joshua Beny Hürzeler as part of the Master's Thesis at University of St. Gallen (HSG), 2026.*