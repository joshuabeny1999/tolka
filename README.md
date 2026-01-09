# Tolka - Bridging the Communication Gap

![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=flat&logo=go)
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

The architecture follows the "Majestic Monolith" pattern to ensure easy deployment and low latency.

* **Backend:** Go (Golang)
    * **Speech Engine:** **Microsoft Azure Speech Services** (optimized for Swiss German/`de-CH` and low latency via Switzerland North region).
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
* **Microsoft Cognitive Services Speech SDK** (Required for local Go development)

### 0. Configuration (Required)
Before running the app (via Docker or Local), you need to set up the environment variables.

1. Copy the example file:
   ```bash
   cp .env.example .env
2. Open .env and configure the Azure Speech Service:
    ```
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=switzerlandnorth    ```

### Option A: Run with Docker (Recommended for Preview/Production)
This builds the full container just like in production.

```bash
# Build and run
docker compose up --build
```

The app is now accessible at [http://localhost:8080](https://www.google.com/search?q=http://localhost:8080).

Hier ist der aktualisierte Abschnitt für deine **README.md**.

Er ist jetzt viel professioneller und einfacher, da wir das `Makefile` und `Air` integriert haben.


### Option B: Local Development (Hot Reload)

For the best developer experience, we use **Air** (Go hot reload) and **Vite** (Frontend hot reload) running concurrently.


#### 1. One-time Setup
Install the necessary tools and dependencies:

```bash
# Install Air (Hot reload for Go)
go install github.com/air-verse/air@latest

# Install Frontend dependencies
cd frontend
npm install

```

To run the backend locally on macOS/Linux, you must have the Azure Speech SDK C-libraries linked.

#### macOS Setup (Apple Silicon):

Download the Speech SDK for macOS.

Extract the MicrosoftCognitiveServicesSpeech.xcframework.

Export the CGO flags in your shell (e.g., .zshrc):

```bash
export AZURE_SPEECH_SDK="/path/to/xcframework/macos-arm64_x86_64"
export CGO_CFLAGS="-F$AZURE_SPEECH_SDK -I$AZURE_SPEECH_SDK/MicrosoftCognitiveServicesSpeech.framework/Headers"
export CGO_LDFLAGS="-F$AZURE_SPEECH_SDK -framework MicrosoftCognitiveServicesSpeech -Wl,-rpath,$AZURE_SPEECH_SDK"
export DYLD_FRAMEWORK_PATH="$AZURE_SPEECH_SDK:$DYLD_FRAMEWORK_PATH"
```
#### 2. Start Development Server

Simply run the make command from the project root. This starts both the Go backend and React frontend in a single terminal.

```bash
make dev

```

* **Frontend:** Open [http://localhost:5173](http://localhost:5173) (Proxies API requests to backend automatically)
* **Backend:** Runs on port `8080` (rebuilds automatically on save)

## 🏗 Project Structure

```text
tolka/
├── cmd/server/         # Main entry point for the Go application
├── internal/           # Private application logic (Audio processing, WebSocket)
├── frontend/           # React application
├── Dockerfile          # Multi-stage Docker build definition
└── docker-compose.yml  # Local development setup
└── env.example         # sample environment variables

```

## 🔒 Authentication

To protect the application from unauthorized access (and unexpected API costs), Tolka supports optional **HTTP Basic Auth**.

* **Development:** If `AUTH_USERNAME` or `AUTH_PASSWORD` are empty or not set, authentication is **disabled**.
* **Production:** Set the variables to enforce login for the entire application (Frontend + WebSocket).

Add these to your `.env` file or Docker environment:

```env
# Basic Auth Credentials
AUTH_USERNAME=admin
AUTH_PASSWORD=change_me_to_something_secure
WS_TOKEN=change_me_to_something_secure
```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Created by Joshua Beny Hürzeler as part of the Master's Thesis at University of St. Gallen (HSG), 2026.*