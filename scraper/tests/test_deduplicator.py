"""Unit tests for ArticleDeduplicator and URL canonicalization."""

import unittest
from datetime import datetime, timezone
from database.models import Article
from processing.deduplicator import ArticleDeduplicator


class TestArticleDeduplicator(unittest.TestCase):
    """Test suite for URL canonicalization and duplicate filtering."""

    def test_canonicalize_url_strips_utm_and_trackers(self):
        url = "https://WWW.EXAMPLE.COM/news/story-123/?utm_source=twitter&utm_medium=social&fbclid=XYZ123#story-comments"
        canonical = ArticleDeduplicator.canonicalize_url(url)
        self.assertEqual(canonical, "https://www.example.com/news/story-123")

    def test_canonicalize_url_preserves_legitimate_query_params(self):
        url = "https://example.com/article?id=9876&utm_campaign=daily&page=2"
        canonical = ArticleDeduplicator.canonicalize_url(url)
        self.assertEqual(canonical, "https://example.com/article?id=9876&page=2")

    def test_canonicalize_url_strips_trailing_slash_on_paths(self):
        url = "https://example.com/news/tech/"
        canonical = ArticleDeduplicator.canonicalize_url(url)
        self.assertEqual(canonical, "https://example.com/news/tech")

    def test_canonicalize_url_preserves_root_path(self):
        url = "https://example.com/"
        canonical = ArticleDeduplicator.canonicalize_url(url)
        self.assertEqual(canonical, "https://example.com/")

    def test_filter_batch_duplicates_against_database_and_within_batch(self):
        now = datetime.now(timezone.utc)
        articles = [
            Article(title="Story 1", source="BBC", url="https://example.com/story-1", published_at=now),
            Article(title="Story 2", source="BBC", url="https://example.com/story-2", published_at=now),
            Article(title="Story 1 Duplicate", source="BBC", url="https://example.com/story-1", published_at=now),
            Article(title="Story 3 (Existing)", source="NPR", url="https://example.com/story-3", published_at=now),
            Article(title="Story 4", source="NPR", url="https://example.com/story-4", published_at=now),
        ]

        existing_urls = {"https://example.com/story-3"}
        unique_articles, skipped_count = ArticleDeduplicator.filter_batch_duplicates(articles, existing_urls)

        # Out of 5 articles:
        # story-1 (new)
        # story-2 (new)
        # story-1 (duplicate within batch -> skipped)
        # story-3 (existing in DB -> skipped)
        # story-4 (new)
        self.assertEqual(len(unique_articles), 3)
        self.assertEqual(skipped_count, 2)
        self.assertEqual([a.url for a in unique_articles], [
            "https://example.com/story-1",
            "https://example.com/story-2",
            "https://example.com/story-4",
        ])


if __name__ == "__main__":
    unittest.main()
