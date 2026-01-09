package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DeepgramAPIKey string
	AzureAPIKey    string
	AzureRegion    string
	Port           string
	AuthUsername   string
	AuthPassword   string
	WsToken        string
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
	wsToken := os.Getenv("WS_TOKEN")

	azureApiKey := os.Getenv("AZURE_API_KEY")
	azureRegion := os.Getenv("AZURE_REGION")

	return &Config{
		DeepgramAPIKey: apiKey,
		AzureAPIKey:    azureApiKey,
		AzureRegion:    azureRegion,
		Port:           port,
		AuthUsername:   authUsername,
		AuthPassword:   authPassword,
		WsToken:        wsToken,
	}
}
