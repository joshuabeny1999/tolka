# --- Stage 1: Build React Frontend ---
FROM --platform=linux/amd64 node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend ---
FROM --platform=linux/amd64 golang:1.25-bookworm AS backend-builder
WORKDIR /src

# CGO deaktivieren! Da wir keine C-Libraries mehr linken,
# bauen wir ein statisches Go Binary. Das ist robuster und einfacher.
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend-builder /app/dist ./cmd/server/dist

# Build (einfacher Standard-Befehl ohne linker flags)
RUN go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image (Python Base) ---
# Wir nehmen ein Python-Image als Basis, da Python die schwerste Abhängigkeit ist.
FROM --platform=linux/amd64 python:3.11-slim-bookworm

LABEL application="tolka-app"
WORKDIR /root/

# 1. System Dependencies (Minimal)
# Wir brauchen nur ca-certificates für HTTPS
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Azure SDK für Python installieren
# --no-cache-dir hält das Image klein
RUN pip install --no-cache-dir azure-cognitiveservices-speech

# 3. Dateien kopieren
# Das Go Binary
COPY --from=backend-builder /src/tolka-app .
# Das Python Skript (muss im gleichen Ordner liegen oder im PATH)
COPY "cmd/server/azure_worker.py" .

EXPOSE 8080
CMD ["./tolka-app"]