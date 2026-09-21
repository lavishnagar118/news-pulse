"""Configuration loader for the News Pulse Scraper."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from scraper directory if present
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)


class Config:
    """Application configuration for the scraper service."""

    # Database Configuration (supports local MongoDB and MongoDB Atlas)
    MONGODB_URI: str = os.getenv(
        "MONGODB_URI",
        "mongodb://127.0.0.1:27017/news_pulse"
    )

    # Logging & Network Settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "15"))
    SCRAPER_USER_AGENT: str = os.getenv(
        "SCRAPER_USER_AGENT",
        "NewsPulseBot/1.0 (+https://github.com/example/news-pulse; contact@newspulse.internal)"
    )
    MAX_CONTENT_BYTES: int = int(os.getenv("MAX_CONTENT_BYTES", str(5 * 1024 * 1024)))  # 5MB limit

    # Topic Clustering Parameters
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.12"))
    TFIDF_MAX_DF: float = float(os.getenv("TFIDF_MAX_DF", "0.85"))
    TFIDF_MIN_DF: int = int(os.getenv("TFIDF_MIN_DF", "1"))
    TFIDF_NGRAM_MAX: int = int(os.getenv("TFIDF_NGRAM_MAX", "2"))

    # Optional AI Settings (Ollama enhancement - disabled by default, not used for ingestion)
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "none").lower()
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")

    # Ingestion Cloud HTTP Service Settings
    INGESTION_SERVICE_SECRET: str = os.getenv("INGESTION_SERVICE_SECRET", "")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    @classmethod
    def is_ai_enabled(cls) -> bool:
        """Returns True only if AI_PROVIDER is explicitly set to 'ollama'."""
        return cls.AI_PROVIDER == "ollama"
