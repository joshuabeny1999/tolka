package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DeepgramAPIKey string
	Port           string
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

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "local"
	}

	return &Config{
		DeepgramAPIKey: apiKey,
		Port:           port,
	}
}
