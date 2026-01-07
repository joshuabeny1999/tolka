.PHONY: dev

dev:
	# Startet Go (Air) und React (Vite) gleichzeitig
	# --kill-others sorgt dafür, dass beides stoppt, wenn du Ctrl+C drückst
	cd frontend && npx concurrently --kill-others \
		"npm run dev" \
		"cd .. && air" \
		--names "REACT,GO" \
		--prefix-colors "cyan,magenta"