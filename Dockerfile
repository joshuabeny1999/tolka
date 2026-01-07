# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend ---
FROM golang:1.25-alpine AS backend-builder
WORKDIR /src
RUN apk add --no-cache git

# Dependencies cachen
COPY go.mod go.sum ./
RUN go mod download

# Frontend Build an den Ort kopieren, wo dein Go-Code (embed) es erwartet
# Pfad: /src/cmd/server/dist
COPY --from=frontend-builder /app/dist ./cmd/server/dist

# Restlichen Code kopieren
COPY . .

# Build Command - expliziter Pfad zum Main-File!
# Das Binary wird direkt in /src/tolka-app abgelegt
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image ---
FROM alpine:latest
WORKDIR /root/
RUN apk --no-cache add ca-certificates

# Kopiere das Binary aus /src/tolka-app (Stage 2) nach /root/ (Stage 3)
COPY --from=backend-builder /src/tolka-app .

EXPOSE 8080
CMD ["./tolka-app"]