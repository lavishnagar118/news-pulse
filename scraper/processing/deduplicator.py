"""Deduplication logic for canonicalizing URLs and filtering duplicate articles."""

import logging
from typing import List, Set, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

logger = logging.getLogger("news-pulse.scraper.deduplicator")

# Common marketing and analytics query tracking parameters to strip
TRACKING_PARAMS: Set[str] = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_cid",
    "utm_reader",
    "fbclid",
    "gclid",
    "ocid",
    "cmpid",
    "ref",
    "ref_src",
    "xtor",
    "at_medium",
    "at_campaign",
}


class ArticleDeduplicator:
    """Detects and filters duplicate articles by canonicalized URL identity."""

    @staticmethod
    def canonicalize_url(raw_url: str) -> str:
        """Normalize and canonicalize a news article URL.

        Transformations:
        1. Strips leading and trailing whitespace.
        2. Lowercases scheme and netloc (domain).
        3. Removes tracking query parameters (UTM, fbclid, etc.).
        4. Drops URL fragments (#hash).
        5. Removes trailing slash on paths unless root.
        """
        if not raw_url:
            return ""

        url = raw_url.strip()
        parsed = urlparse(url)

        # Standardize scheme and domain
        scheme = parsed.scheme.lower() if parsed.scheme else "https"
        netloc = parsed.netloc.lower()

        # Filter out tracking query params while preserving meaningful parameters
        query_pairs = parse_qsl(parsed.query, keep_blank_values=False)
        cleaned_query = [
            (k, v) for k, v in query_pairs
            if k.lower() not in TRACKING_PARAMS
        ]
        # Sort remaining query parameters for canonical consistency
        cleaned_query.sort(key=lambda x: x[0])
        new_query = urlencode(cleaned_query)

        # Normalize path: remove trailing slash for paths longer than "/"
        path = parsed.path
        if len(path) > 1 and path.endswith("/"):
            path = path.rstrip("/")

        # Reconstruct URL without fragment
        canonical = urlunparse((scheme, netloc, path, parsed.params, new_query, ""))
        return canonical

    @classmethod
    def filter_batch_duplicates(
        cls,
        candidate_articles: List,
        existing_urls: Set[str],
    ) -> Tuple[List, int]:
        """Filter a candidate list of articles against existing URLs and within-batch duplicates.

        Args:
            candidate_articles: List of normalized Article objects.
            existing_urls: Set of canonical URLs already stored in MongoDB.

        Returns:
            Tuple of (unique_articles_to_process, duplicates_skipped_count).
        """
        seen_in_batch: Set[str] = set()
        unique_articles = []
        duplicates_count = 0

        for article in candidate_articles:
            url = article.url
            if not url:
                duplicates_count += 1
                continue

            if url in existing_urls:
                logger.debug("Duplicate skipped (already in database): %s", url)
                duplicates_count += 1
            elif url in seen_in_batch:
                logger.debug("Duplicate skipped (duplicate within batch): %s", url)
                duplicates_count += 1
            else:
                seen_in_batch.add(url)
                unique_articles.append(article)

        return unique_articles, duplicates_count
