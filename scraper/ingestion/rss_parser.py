"""RSS and Atom feed parsing using requests and feedparser."""

import logging
from typing import Any, Dict, List, Optional
import feedparser
import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

try:
    from config import Config
    from feeds import RSSFeedConfig
except ImportError:
    from ..config import Config
    from ..feeds import RSSFeedConfig

logger = logging.getLogger("news-pulse.scraper.parser")


class RSSFeedParser:
    """Fetches and parses public RSS/Atom feed streams safely."""

    def __init__(self, user_agent: Optional[str] = None, timeout: Optional[int] = None):
        self.user_agent = user_agent or Config.SCRAPER_USER_AGENT
        self.timeout = timeout or Config.REQUEST_TIMEOUT
        
        # Configure resilient HTTP session with retry logic
        self.session = requests.Session()
        retries = Retry(
            total=2,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def fetch_feed(self, feed: RSSFeedConfig) -> List[Dict[str, Any]]:
        """Fetch and parse feed entries from a given RSSFeedConfig.

        Uses requests to manage timeouts, headers, and status code verification,
        then parses the XML payload using feedparser.

        Args:
            feed: RSSFeedConfig containing URL, name, and custom headers.

        Returns:
            List of parsed raw entry dictionaries. Returns empty list if feed fails.
        """
        logger.info("Fetching feed [%s] from %s", feed.name, feed.url)
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "Cache-Control": "max-age=0, no-cache",
            "Pragma": "no-cache",
        }
        if feed.headers:
            headers.update(feed.headers)

        try:
            response = self.session.get(
                feed.url,
                headers=headers,
                timeout=self.timeout,
                allow_redirects=True,
                stream=True,
            )

            if response.status_code != 200:
                logger.warning(
                    "Feed [%s] returned non-200 status code: %d",
                    feed.name,
                    response.status_code,
                )
                return []

            # Limit feed XML payload size to prevent XML bomb / memory exhaustion
            raw_content = response.raw.read(Config.MAX_CONTENT_BYTES, decode_content=True)
            parsed = feedparser.parse(raw_content)

            if parsed.bozo and not parsed.entries:
                # bozo flag is set when XML has syntax issues
                logger.warning(
                    "Feed [%s] parsed with XML error (%s) and 0 entries found.",
                    feed.name,
                    getattr(parsed, "bozo_exception", "Unknown parse exception"),
                )
                return []

            entries = parsed.entries
            logger.info("Feed [%s] successfully parsed: %d entries found.", feed.name, len(entries))
            return entries

        except requests.exceptions.Timeout:
            logger.error("Feed [%s] request timed out after %ds: %s", feed.name, self.timeout, feed.url)
            return []
        except requests.exceptions.RequestException as err:
            logger.error("Feed [%s] network request failed: %s", feed.name, err)
            return []
        except Exception as err:
            logger.error("Unexpected error parsing feed [%s]: %s", feed.name, err, exc_info=True)
            return []
