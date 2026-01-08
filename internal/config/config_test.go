package config

import (
	"testing"
)

func TestLoad_Defaults(t *testing.T) {
	// 1. Setup: Ensure environment is clean/empty for these keys
	// t.Setenv cleans up automatically after the test
	t.Setenv("PORT", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("DEEPGRAM_API_KEY", "")

	// 2. Execution
	cfg := Load()

	// 3. Assertion
	if cfg.Port != "8080" {
		t.Errorf("Expected default port '8080', got '%s'", cfg.Port)
	}

	if cfg.DeepgramAPIKey != "" {
		t.Errorf("Expected empty API key, got '%s'", cfg.DeepgramAPIKey)
	}
}

func TestLoad_Overrides(t *testing.T) {
	// 1. Setup: Set specific environment variables
	expectedPort := "3000"
	expectedKey := "secret-key"

	t.Setenv("PORT", expectedPort)
	t.Setenv("DEEPGRAM_API_KEY", expectedKey)

	// 2. Execution
	cfg := Load()

	// 3. Assertion
	if cfg.Port != expectedPort {
		t.Errorf("Expected port '%s', got '%s'", expectedPort, cfg.Port)
	}

	if cfg.DeepgramAPIKey != expectedKey {
		t.Errorf("Expected API key '%s', got '%s'", expectedKey, cfg.DeepgramAPIKey)
	}
}
