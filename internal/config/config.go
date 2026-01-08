package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DeepgramAPIKey string
	Port           string
	AuthUsername   string
	AuthPassword   string
}

func Load() *Config {
	_ = godotenv.Load()

	apiKey := os.Getenv("DEEPGRAM_API_KEY")
	if apiKey == "" {
		log.Println("Note: DEEPGRAM_API_KEY is not set")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	authUsername := os.Getenv("AUTH_USERNAME")
	authPassword := os.Getenv("AUTH_PASSWORD")

	return &Config{
		DeepgramAPIKey: apiKey,
		Port:           port,
		AuthUsername:   authUsername,
		AuthPassword:   authPassword,
	}
}
