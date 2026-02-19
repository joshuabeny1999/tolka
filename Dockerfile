# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend ---
FROM golang:1.25-bookworm AS backend-builder
WORKDIR /src

ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend-builder /app/dist ./cmd/server/dist

RUN go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image (Python Base) ---
FROM python:3.11-slim-bookworm

LABEL application="tolka-app"
WORKDIR /root/

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir azure-cognitiveservices-speech

COPY --from=backend-builder /src/tolka-app .
COPY "cmd/server/azure_worker.py" .

EXPOSE 8080
CMD ["./tolka-app"]