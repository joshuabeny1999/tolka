# --- Stage 1: Build React Frontend ---
# Wir bleiben konsistent auf amd64
FROM --platform=linux/amd64 node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend ---
# Basierend auf MS Docs: Debian 12 (Bookworm) Support
FROM --platform=linux/amd64 golang:1.25-bookworm AS backend-builder
WORKDIR /src

# 1. Install System Dependencies (aus der Anleitung)
# build-essential, ca-certificates, libasound2-dev, libssl-dev, wget
RUN apt-get update && apt-get install -y \
    build-essential \
    ca-certificates \
    libasound2-dev \
    libssl-dev \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 2. Download and Setup SDK (Strictly following docs)
# Wir setzen das Root-Verzeichnis wie in der Anleitung
ENV SPEECHSDK_ROOT="/opt/speechsdk"
RUN mkdir -p "$SPEECHSDK_ROOT"

WORKDIR /tmp
# Download und Entpacken direkt in das Zielverzeichnis mit -C
RUN wget -O SpeechSDK-Linux.tar.gz https://aka.ms/csspeech/linuxbinary \
    && tar --strip 1 -xzf SpeechSDK-Linux.tar.gz -C "$SPEECHSDK_ROOT"

# 3. Configure Go Environment (aus der Anleitung)
# WICHTIG: Hier wird auf include/c_api verwiesen, das hat vorher gefehlt.
ENV CGO_CFLAGS="-I$SPEECHSDK_ROOT/include/c_api"
ENV CGO_LDFLAGS="-L$SPEECHSDK_ROOT/lib/x64 -lMicrosoft.CognitiveServices.Speech.core"
# Sicherstellen, dass wir für x64 bauen
ENV GOARCH=amd64

# 4. Go Build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend-builder /app/dist ./cmd/server/dist

# Build
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image ---
FROM --platform=linux/amd64 debian:bookworm-slim
LABEL application="tolka-app"
WORKDIR /root/

# 1. Runtime Dependencies
# libssl-dev zieht die korrekten OpenSSL 3 Libs für Bookworm
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libasound2 \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. SDK für Runtime bereitstellen
ENV SPEECHSDK_ROOT="/opt/speechsdk"
RUN mkdir -p "$SPEECHSDK_ROOT"

# Wir kopieren das SDK aus dem Builder-Stage, damit die Pfade gleich bleiben
COPY --from=backend-builder /opt/speechsdk /opt/speechsdk

# 3. LD_LIBRARY_PATH setzen (aus der Anleitung)
# Damit findet das Binary beim Starten die .so Dateien unter lib/x64
ENV LD_LIBRARY_PATH="$SPEECHSDK_ROOT/lib/x64:$LD_LIBRARY_PATH"

# 4. App kopieren
COPY --from=backend-builder /src/tolka-app .

EXPOSE 8080
CMD ["./tolka-app"]