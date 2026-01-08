.PHONY: dev

dev:
	cd frontend && npx concurrently --kill-others \
		"npm run dev" \
		"cd .. && air" \
		--names "REACT,GO" \
		--prefix-colors "cyan,magenta"