# Variablen
VENV := venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

.PHONY: dev install clean

# 1. Install-Target: Full Stack Setup (Python, Node, Go Tools)
install:
	@echo "--- 🐍 Setup Python (Azure Worker) ---"
	@# Venv erstellen, falls nicht vorhanden
	test -d $(VENV) || python3 -m venv $(VENV)
	@# Dependencies installieren
	$(PIP) install -r requirements.txt

	@echo "--- 📦 Setup Frontend (Node modules) ---"
	@# npm install nur ausführen, wenn node_modules fehlt oder package.json neuer ist
	@if [ ! -d "frontend/node_modules" ]; then \
		cd frontend && npm install; \
	fi

	@echo "--- 🐹 Setup Go Tools (Air) ---"
	@# Prüfen ob 'air' im Pfad ist, sonst installieren
	@if ! command -v air > /dev/null; then \
		echo "Air not found. Installing..."; \
		go install github.com/air-verse/air@latest; \
	else \
		echo "Air is already ready."; \
	fi

# 2. Dev-Target: Startet Frontend & Backend
dev: install
	@echo "--- 🚀 Starting Tolka Dev Server ---"
	cd frontend && npx concurrently --kill-others \
	   "npm run dev" \
	   "cd .. && . $(VENV)/bin/activate && air" \
	   --names "REACT,GO" \
	   --prefix-colors "cyan,magenta"

# Aufräumen
clean:
	rm -rf $(VENV)
	rm -rf frontend/node_modules
	rm -rf cmd/server/dist