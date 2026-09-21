"""Ingestion package handling feed parsing, normalization, and article extraction."""

from .rss_parser import RSSFeedParser
from .normalizer import FeedNormalizer
from .extractor import ArticleExtractor

__all__ = ["RSSFeedParser", "FeedNormalizer", "ArticleExtractor"]
