"""Feed definitions and source configuration for RSS/Atom ingestion."""

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class RSSFeedConfig:
    """Configuration for an individual public RSS feed source."""
    name: str
    url: str
    enabled: bool = True
    headers: Dict[str, str] = field(default_factory=dict)
    description: Optional[str] = None


# Default set of stable, public news RSS feeds
DEFAULT_FEEDS: List[RSSFeedConfig] = [
    RSSFeedConfig(
        name="BBC News",
        url="https://feeds.bbci.co.uk/news/world/rss.xml",
        enabled=True,
        description="BBC World News RSS feed",
        headers={"Accept": "application/rss+xml, application/xml, text/xml"},
    ),
    RSSFeedConfig(
        name="NPR News",
        url="https://feeds.npr.org/1001/rss.xml",
        enabled=True,
        description="NPR Top News Stories",
        headers={"Accept": "application/rss+xml, application/xml, text/xml"},
    ),
    RSSFeedConfig(
        name="Al Jazeera",
        url="https://www.aljazeera.com/xml/rss/all.xml",
        enabled=True,
        description="Al Jazeera English News Feed",
        headers={"Accept": "application/rss+xml, application/xml, text/xml"},
    ),
]


def get_enabled_feeds(feed_list: Optional[List[RSSFeedConfig]] = None) -> List[RSSFeedConfig]:
    """Return only feeds that are currently enabled."""
    feeds = feed_list if feed_list is not None else DEFAULT_FEEDS
    return [feed for feed in feeds if feed.enabled]
