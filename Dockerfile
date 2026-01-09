# --- Stage 1: Build React Frontend (Bleibt Alpine, da Node unabhängig ist) ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend (Debian Bookworm statt Alpine!) ---
# Wir nutzen Debian, da Azure SDK glibc benötigt
FROM golang:1.23-bookworm AS backend-builder
WORKDIR /src

# 1. Notwendige Tools installieren
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    ca-certificates \
    gnupg \
    lsb-release

# 2. Microsoft Repository hinzufügen & Speech SDK installieren
# Hinweis: Das SDK muss zum Kompilieren (Header-Dateien) vorhanden sein
RUN wget -O - https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/microsoft-prod.list \
    && apt-get update \
    && apt-get install -y libmicrosoft-cognitive-services-speech-sdk

# 3. Go Dependencies laden
COPY go.mod go.sum ./
RUN go mod download

# 4. Source Code kopieren
COPY . .

# 5. Frontend Build rüberkopieren (in embed Ordner)
COPY --from=frontend-builder /app/dist ./cmd/server/dist

# 6. Bauen
# WICHTIG: CGO_ENABLED=1 ist Pflicht für Azure!
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image (Debian Slim) ---
FROM debian:bookworm-slim
LABEL application="tolka-app"
WORKDIR /root/

# 1. Runtime Dependencies installieren
# Auch das fertige Binary braucht die .so Libraries zur Laufzeit!
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    gnupg \
    && wget -O - https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/microsoft-prod.list \
    && apt-get update \
    && apt-get install -y libmicrosoft-cognitive-services-speech-sdk \
    && rm -rf /var/lib/apt/lists/*

# 2. Binary kopieren
COPY --from=backend-builder /src/tolka-app .

EXPOSE 8080
CMD ["./tolka-app"]