"""Unit tests for deterministic category classification and image extraction."""

import pytest
from processing.categorizer import ArticleCategorizer
from ingestion.extractor import ArticleExtractor
from ingestion.normalizer import FeedNormalizer


class TestCategorizer:
    def test_technology_categorization(self):
        cat = ArticleCategorizer.classify(
            title="US and China discuss AI safety plan ahead of tech summit",
            summary="Delegations discussed neural network risks and computing power controls.",
        )
        assert cat == "Technology"

    def test_politics_categorization(self):
        cat = ArticleCategorizer.classify(
            title="German Chancellor Merz calls election a disaster for CDU party",
            summary="Voters cast their ballots in key state parliamentary election.",
        )
        assert cat == "Politics"

    def test_sports_categorization(self):
        cat = ArticleCategorizer.classify(
            title="Premier League football referee under fire after controversial match",
            summary="Mourinho fumes over late penalty decision in stadium.",
        )
        assert cat == "Sports"

    def test_world_categorization(self):
        cat = ArticleCategorizer.classify(
            title="Ukraine and Russia ceasefire talks stall at United Nations",
            summary="Military troops engage near border conflict zone.",
        )
        assert cat == "World"

    def test_fallback_general(self):
        cat = ArticleCategorizer.classify(
            title="A curious walk down an unusual cobblestone street",
            summary="Locals reflect on quiet morning routines.",
        )
        assert cat == "General"


class TestImageExtraction:
    def test_extract_html_image_og_image(self):
        html_content = """
        <html>
            <head>
                <meta property="og:image" content="https://example.com/images/lead.jpg" />
            </head>
            <body><p>Article body</p></body>
        </html>
        """
        img = ArticleExtractor.extract_html_image(html_content)
        assert img == "https://example.com/images/lead.jpg"

    def test_extract_html_image_twitter_fallback(self):
        html_content = """
        <html>
            <head>
                <meta name="twitter:image" content="https://example.com/images/twitter.png" />
            </head>
            <body><p>Article body</p></body>
        </html>
        """
        img = ArticleExtractor.extract_html_image(html_content)
        assert img == "https://example.com/images/twitter.png"

    def test_extract_rss_image_media_thumbnail(self):
        entry = {
            "title": "Sample Story",
            "media_thumbnail": [{"url": "https://example.com/thumb.jpg", "width": "240"}],
        }
        img = FeedNormalizer.extract_rss_image(entry)
        assert img == "https://example.com/thumb.jpg"
