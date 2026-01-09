# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Go Backend ---
# Using Debian 12 (Bookworm) which supports OpenSSL 3.x natively
FROM golang:1.23-bookworm AS backend-builder
WORKDIR /src

# 1. Install system dependencies as requested
# - build-essential: Compiler tools
# - ca-certificates: SSL verification
# - libasound2-dev: ALSA sound library headers
# - libssl-dev: OpenSSL development headers (links to OpenSSL 3.x on Bookworm)
# - wget: File retrieval
# - gnupg, lsb-release, apt-transport-https: Helper tools for repo management
RUN apt-get update && apt-get install -y \
    build-essential \
    ca-certificates \
    libasound2-dev \
    libssl-dev \
    wget \
    gnupg \
    lsb-release \
    apt-transport-https

# 2. Add Microsoft Repository for Debian 12 (Bookworm)
# We use the 'bookworm' codename and path /debian/12/prod
RUN wget -O - https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/microsoft-prod.list

# 3. Install the actual Speech SDK library (needed for linking CGO)
RUN apt-get update && apt-get install -y libmicrosoft-cognitive-services-speech-sdk

# 4. Go Build
COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend-builder /app/dist ./cmd/server/dist

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -ldflags="-s -w" -o tolka-app ./cmd/server/main.go

# --- Stage 3: Final Runtime Image ---
# Using Debian 12 (Bookworm) Slim
FROM debian:bookworm-slim
LABEL application="tolka-app"
WORKDIR /root/

# 1. Install Runtime Dependencies
# - libasound2: Runtime ALSA library (dev not needed strictly, but headers don't hurt if unsure)
# - libssl-dev / openssl: Ensures OpenSSL 3.x libraries are present
# - ca-certificates: Crucial for HTTPS calls to Azure
RUN apt-get update && apt-get install -y \
    ca-certificates \
    wget \
    gnupg \
    apt-transport-https \
    libasound2 \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Add Microsoft Repository (same as builder, for Debian 12)
RUN wget -O - https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" > /etc/apt/sources.list.d/microsoft-prod.list

# 3. Install the Speech SDK Shared Libraries (Runtime)
RUN apt-get update && apt-get install -y \
    libmicrosoft-cognitive-services-speech-sdk \
    && rm -rf /var/lib/apt/lists/*

# 4. Copy Binary
COPY --from=backend-builder /src/tolka-app .

EXPOSE 8080
CMD ["./tolka-app"]