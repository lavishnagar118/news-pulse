"""Database access layer using PyMongo for the News Pulse scraper."""

from .connection import DatabaseManager
from .models import Article, Cluster, IngestionJob

__all__ = ["DatabaseManager", "Article", "Cluster", "IngestionJob"]
