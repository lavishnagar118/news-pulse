"""Normalizer for standardizing disparate RSS/Atom feed entries into Article models."""

import html
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bs4 import BeautifulSoup
from dateutil import parser as date_parser

try:
    from database.models import Article, utc_now
    from processing.deduplicator import ArticleDeduplicator
    from processing.categorizer import ArticleCategorizer
except ImportError:
    from ..database.models import Article, utc_now
    from ..processing.deduplicator import ArticleDeduplicator
    from ..processing.categorizer import ArticleCategorizer

logger = logging.getLogger("news-pulse.scraper.normalizer")


class FeedNormalizer:
    """Standardizes disparate RSS/Atom feed entries into unified Article domain models."""

    @staticmethod
    def clean_text(raw_text: Optional[str]) -> str:
        """Strip HTML tags and unescape HTML entities to produce clean plain text."""
        if not raw_text:
            return ""
        # Unescape HTML entities first (e.g. &lt;p&gt; -> <p>, &amp; -> &)
        unescaped = html.unescape(raw_text.strip())
        # Strip HTML markup using BeautifulSoup
        try:
            soup = BeautifulSoup(unescaped, "html.parser")
            cleaned = soup.get_text(separator=" ", strip=True)
            # Collapse excessive whitespace
            return re.sub(r"\s+", " ", cleaned).strip()
        except Exception:
            # Fallback simple regex tag strip
            return re.sub(r"<[^>]+>", " ", unescaped).strip()

    @classmethod
    def parse_publication_date(cls, entry: Dict[str, Any], article_title: str) -> datetime:
        """Parse publication date from standard RSS/Atom parsed tuples or raw strings.
        
        Fallback Strategy:
        1. Check 'published_parsed' 9-tuple from feedparser.
        2. Check 'updated_parsed' 9-tuple from feedparser.
        3. Parse raw string fields ('published', 'pubDate', 'updated') using python-dateutil.
        4. If all fail or absent, fall back to current UTC timestamp and log the event.
        """
        # 1. feedparser parsed time tuple
        time_tuple = entry.get("published_parsed") or entry.get("updated_parsed")
        if time_tuple and len(time_tuple) >= 6:
            try:
                # time_tuple is in UTC
                return datetime(*time_tuple[:6], tzinfo=timezone.utc)
            except (ValueError, TypeError) as err:
                logger.debug("Failed constructing datetime from parsed tuple: %s", err)

        # 2. Raw string fields
        for date_key in ("published", "pubDate", "updated", "created", "dc:date"):
            raw_date = entry.get(date_key)
            if raw_date and isinstance(raw_date, str):
                try:
                    dt = date_parser.parse(raw_date)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    else:
                        dt = dt.astimezone(timezone.utc)
                    return dt
                except (ValueError, TypeError, OverflowError):
                    continue

        # 3. Documented fallback: current UTC timestamp
        fallback_dt = utc_now()
        logger.info(
            "Article '%s': Missing or unparseable publication date; using fallback timestamp %s",
            article_title[:60],
            fallback_dt.isoformat(),
        )
        return fallback_dt

    @classmethod
    def extract_url(cls, entry: Dict[str, Any]) -> str:
        """Extract canonical article URL from entry fields."""
        raw_url = ""
        # Direct link
        if entry.get("link"):
            raw_url = entry["link"]
        elif entry.get("id") and entry["id"].startswith(("http://", "https://")):
            raw_url = entry["id"]
        elif entry.get("links") and isinstance(entry["links"], list):
            for lk in entry["links"]:
                if isinstance(lk, dict) and lk.get("rel") in ("alternate", None) and lk.get("href"):
                    raw_url = lk["href"]
                    break

        return ArticleDeduplicator.canonicalize_url(raw_url)

    @classmethod
    def extract_summary(cls, entry: Dict[str, Any]) -> str:
        """Extract summary text from description, summary, or content:encoded."""
        raw_summary = (
            entry.get("summary")
            or entry.get("description")
            or ""
        )

        if not raw_summary and entry.get("content") and isinstance(entry["content"], list):
            raw_summary = entry["content"][0].get("value", "")

        return cls.clean_text(raw_summary)

    @classmethod
    def extract_rss_image(cls, entry: Dict[str, Any]) -> Optional[str]:
        """Extract media image URL from RSS media:content, media:thumbnail, or enclosure tags."""
        # 1. media_content
        media_content = entry.get("media_content")
        if media_content and isinstance(media_content, list):
            for m in media_content:
                if isinstance(m, dict) and m.get("url"):
                    medium = m.get("medium", "")
                    m_type = m.get("type", "")
                    if medium == "image" or "image" in m_type or (not medium and not m_type):
                        return m["url"]

        # 2. media_thumbnail
        media_thumbnail = entry.get("media_thumbnail")
        if media_thumbnail and isinstance(media_thumbnail, list):
            for m in media_thumbnail:
                if isinstance(m, dict) and m.get("url"):
                    return m["url"]

        # 3. enclosures
        enclosures = entry.get("enclosures")
        if enclosures and isinstance(enclosures, list):
            for enc in enclosures:
                if isinstance(enc, dict):
                    url = enc.get("href") or enc.get("url")
                    enc_type = enc.get("type", "")
                    if url and ("image" in enc_type or not enc_type):
                        return url

        # 4. links with image type
        links = entry.get("links")
        if links and isinstance(links, list):
            for lk in links:
                if isinstance(lk, dict):
                    if "image" in lk.get("type", "") and lk.get("href"):
                        return lk["href"]

        return None

    @classmethod
    def normalize_entry(cls, entry: Dict[str, Any], source_name: str) -> Optional[Article]:
        """Transform a raw feed entry dictionary into a structured Article instance.

        Returns None if required fields (title, url) cannot be resolved.
        """
        raw_title = entry.get("title") or ""
        clean_title = cls.clean_text(raw_title)

        if not clean_title:
            logger.debug("Skipping entry from [%s]: missing title", source_name)
            return None

        canonical_url = cls.extract_url(entry)
        if not canonical_url or not canonical_url.startswith(("http://", "https://")):
            logger.debug("Skipping entry '%s' from [%s]: missing or invalid URL", clean_title[:40], source_name)
            return None

        published_at = cls.parse_publication_date(entry, clean_title)
        summary = cls.extract_summary(entry)
        rss_image = cls.extract_rss_image(entry)
        category = ArticleCategorizer.classify(clean_title, summary)

        return Article(
            title=clean_title,
            source=source_name,
            url=canonical_url,
            published_at=published_at,
            summary=summary,
            content=summary,  # Initial content fallback until article body extraction runs
            image_url=rss_image,
            category=category,
            created_at=utc_now(),
            updated_at=utc_now(),
        )

    def normalize_batch(self, entries: List[Dict[str, Any]], source_name: str) -> List[Article]:
        """Normalize a batch of raw entries from a specific feed source."""
        articles: List[Article] = []
        for entry in entries:
            try:
                article = self.normalize_entry(entry, source_name)
                if article:
                    articles.append(article)
            except Exception as err:
                logger.warning(
                    "Error normalizing entry from [%s]: %s (entry title: %s)",
                    source_name,
                    err,
                    entry.get("title", "Unknown"),
                )
        return articles
