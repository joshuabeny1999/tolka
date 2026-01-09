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

COPY go.mod go.sum ./
RUN go mod download

COPY . .

COPY --from=frontend-builder /app/dist ./cmd/server/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image ---
FROM alpine:latest
LABEL application="tolka-app"
WORKDIR /root/
RUN apk --no-cache add ca-certificates

COPY --from=backend-builder /src/tolka-app .

EXPOSE 8080
CMD ["./tolka-app"]