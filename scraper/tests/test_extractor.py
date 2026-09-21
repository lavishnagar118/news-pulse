"""Unit tests for ArticleExtractor and extraction fallback chain."""

import unittest
from unittest.mock import patch
from ingestion.extractor import ArticleExtractor


class TestArticleExtractor(unittest.TestCase):
    """Test suite for article content extraction and fallback behavior."""

    def setUp(self):
        self.extractor = ArticleExtractor(timeout=5)

    @patch.object(ArticleExtractor, "fetch_html")
    def test_trafilatura_extraction_success(self, mock_fetch):
        # HTML containing standard news article text
        html = """
        <!DOCTYPE html>
        <html>
        <head><title>Space Exploration</title></head>
        <body>
            <article>
                <h1>Space Exploration Advances</h1>
                <p>Space agencies announced a joint initiative today to deploy advanced robotic explorers to Europa and Enceladus. The mission aims to investigate subterranean oceans.</p>
                <p>Scientists believe these icy moons may contain hydrothermal vents capable of sustaining microbial life.</p>
            </article>
        </body>
        </html>
        """
        mock_fetch.return_value = (html, None)
        text, success = self.extractor.extract_content("https://example.com/space-1", fallback_text="Short summary")

        self.assertTrue(success)
        self.assertIn("Space agencies announced a joint initiative", text)
        self.assertNotIn("<p>", text)

    @patch.object(ArticleExtractor, "fetch_html")
    @patch.object(ArticleExtractor, "extract_with_trafilatura")
    def test_beautifulsoup_fallback_when_trafilatura_fails(self, mock_traf, mock_fetch):
        # Trafilatura returns None
        mock_traf.return_value = None

        html = """
        <html>
        <body>
            <div class="story-body">
                <p>Renewable energy production broke previous records across the European continent during the summer months.</p>
                <p>Solar and wind generation accounted for over 60 percent of total electrical output in several key member states.</p>
            </div>
        </body>
        </html>
        """
        mock_fetch.return_value = (html, None)
        text, success = self.extractor.extract_content("https://example.com/energy-2", fallback_text="Short summary")

        self.assertTrue(success)
        self.assertIn("Renewable energy production broke previous records", text)

    @patch.object(ArticleExtractor, "fetch_html")
    @patch.object(ArticleExtractor, "extract_with_trafilatura")
    @patch.object(ArticleExtractor, "extract_with_beautifulsoup")
    def test_summary_fallback_when_both_extractors_fail(self, mock_bs, mock_traf, mock_fetch):
        # Both extractors return None
        mock_traf.return_value = None
        mock_bs.return_value = None

        mock_fetch.return_value = ("<html><body>Empty or unsupported page</body></html>", None)
        text, success = self.extractor.extract_content(
            "https://example.com/unsupported",
            fallback_text="Preserved RSS summary fallback text."
        )

        self.assertFalse(success)
        self.assertEqual(text, "Preserved RSS summary fallback text.")

    @patch.object(ArticleExtractor, "fetch_html")
    def test_network_failure_preserves_summary_without_crashing(self, mock_fetch):
        # Network failure (404, timeout, etc.)
        mock_fetch.return_value = (None, "HTTP status 404")
        text, success = self.extractor.extract_content(
            "https://example.com/missing-404",
            fallback_text="Fallback summary on 404"
        )

        self.assertFalse(success)
        self.assertEqual(text, "Fallback summary on 404")


if __name__ == "__main__":
    unittest.main()
