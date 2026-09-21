"""Unit tests for FeedNormalizer and date parsing."""

import unittest
from datetime import datetime, timezone
from ingestion.normalizer import FeedNormalizer


class TestFeedNormalizer(unittest.TestCase):
    """Test suite for RSS/Atom feed normalization and text cleaning."""

    def test_clean_text_removes_html_and_unescapes(self):
        raw = "<p>Breaking News: <b>Scientists</b> discover <i>water</i> &amp; minerals on Mars! &#8217;</p>"
        cleaned = FeedNormalizer.clean_text(raw)
        self.assertEqual(cleaned, "Breaking News: Scientists discover water & minerals on Mars! ’")

    def test_clean_text_empty_and_none(self):
        self.assertEqual(FeedNormalizer.clean_text(None), "")
        self.assertEqual(FeedNormalizer.clean_text("   "), "")

    def test_parse_publication_date_from_parsed_tuple(self):
        entry = {
            "published_parsed": (2026, 9, 21, 12, 30, 0, 0, 264, 0),
        }
        dt = FeedNormalizer.parse_publication_date(entry, "Test Title")
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 9)
        self.assertEqual(dt.day, 21)
        self.assertEqual(dt.hour, 12)
        self.assertEqual(dt.minute, 30)
        self.assertEqual(dt.tzinfo, timezone.utc)

    def test_parse_publication_date_from_rfc822_string(self):
        entry = {
            "pubDate": "Mon, 21 Sep 2026 14:15:00 GMT",
        }
        dt = FeedNormalizer.parse_publication_date(entry, "Test Title")
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 9)
        self.assertEqual(dt.day, 21)
        self.assertEqual(dt.hour, 14)
        self.assertEqual(dt.minute, 15)

    def test_parse_publication_date_fallback_on_missing_date(self):
        entry = {}
        before = datetime.now(timezone.utc)
        dt = FeedNormalizer.parse_publication_date(entry, "Test Missing Date")
        after = datetime.now(timezone.utc)
        self.assertTrue(before <= dt <= after)

    def test_extract_url_direct_link(self):
        entry = {"link": "https://example.com/world/news-1?utm_source=rss"}
        url = FeedNormalizer.extract_url(entry)
        self.assertEqual(url, "https://example.com/world/news-1")

    def test_extract_url_atom_links_list(self):
        entry = {
            "links": [
                {"rel": "self", "href": "https://example.com/feed.xml"},
                {"rel": "alternate", "href": "https://example.com/stories/2026/01"},
            ]
        }
        url = FeedNormalizer.extract_url(entry)
        self.assertEqual(url, "https://example.com/stories/2026/01")

    def test_normalize_valid_standard_rss_entry(self):
        entry = {
            "title": "Global Tech Summit Kicks Off in Tokyo &amp; Seoul",
            "link": "https://news.example.com/tech-summit?utm_campaign=daily#comments",
            "description": "<p>Leaders from 40 nations gathered to discuss AI safety.</p>",
            "published_parsed": (2026, 9, 21, 8, 0, 0, 0, 264, 0),
        }
        article = FeedNormalizer.normalize_entry(entry, "Example News")
        self.assertIsNotNone(article)
        self.assertEqual(article.title, "Global Tech Summit Kicks Off in Tokyo & Seoul")
        self.assertEqual(article.source, "Example News")
        self.assertEqual(article.url, "https://news.example.com/tech-summit")
        self.assertEqual(article.summary, "Leaders from 40 nations gathered to discuss AI safety.")
        self.assertEqual(article.content, "Leaders from 40 nations gathered to discuss AI safety.")
        self.assertEqual(article.published_at.year, 2026)

    def test_normalize_entry_missing_title_is_skipped(self):
        entry = {
            "link": "https://example.com/no-title",
            "description": "Some description",
        }
        article = FeedNormalizer.normalize_entry(entry, "Example News")
        self.assertIsNone(article)

    def test_normalize_entry_missing_url_is_skipped(self):
        entry = {
            "title": "A headline with no URL",
            "description": "Some description",
        }
        article = FeedNormalizer.normalize_entry(entry, "Example News")
        self.assertIsNone(article)


if __name__ == "__main__":
    unittest.main()
