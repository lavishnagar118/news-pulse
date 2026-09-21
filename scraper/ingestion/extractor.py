"""Article content extractor for fetching full body text with robust fallbacks."""

import logging
from typing import Optional, Tuple
from bs4 import BeautifulSoup
import requests
import trafilatura

try:
    from config import Config
except ImportError:
    from ..config import Config

logger = logging.getLogger("news-pulse.scraper.extractor")


class ArticleExtractor:
    """Extracts clean article content using Trafilatura with BeautifulSoup and summary fallbacks."""

    def __init__(
        self,
        user_agent: Optional[str] = None,
        timeout: Optional[int] = None,
        max_bytes: Optional[int] = None,
    ):
        self.user_agent = user_agent or Config.SCRAPER_USER_AGENT
        self.timeout = timeout or Config.REQUEST_TIMEOUT
        self.max_bytes = max_bytes or Config.MAX_CONTENT_BYTES

    def fetch_html(self, url: str) -> Tuple[Optional[str], Optional[str]]:
        """Download raw HTML of an article page safely.

        Returns:
            Tuple of (html_text, error_message)
        """
        if not url or not url.startswith(("http://", "https://")):
            return None, f"Invalid or non-HTTP URL scheme in '{url}'"

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        try:
            with requests.get(
                url,
                headers=headers,
                timeout=self.timeout,
                allow_redirects=True,
                stream=True,
            ) as response:
                if response.status_code == 429:
                    return None, "HTTP status 429: Rate limited by publisher"
                if response.status_code != 200:
                    return None, f"HTTP status {response.status_code}"

                content_type = response.headers.get("Content-Type", "").lower()
                if content_type and not any(t in content_type for t in ("text/html", "application/xhtml", "text/plain")):
                    return None, f"Ignored non-HTML Content-Type: {content_type}"

                # Limit downloaded bytes to prevent denial of service from huge files
                content_chunks = []
                bytes_read = 0
                for chunk in response.iter_content(chunk_size=16384):
                    content_chunks.append(chunk)
                    bytes_read += len(chunk)
                    if bytes_read > self.max_bytes:
                        logger.warning("Article page exceeded size limit (%d bytes): %s", bytes_read, url)
                        break

                raw_bytes = b"".join(content_chunks)
                # Decode with fallback encoding
                encoding = response.encoding or response.apparent_encoding or "utf-8"
                html_text = raw_bytes.decode(encoding, errors="replace")
                return html_text, None

        except requests.exceptions.Timeout:
            return None, f"Request timed out after {self.timeout}s"
        except requests.exceptions.RequestException as err:
            return None, f"Request error: {err}"
        except Exception as err:
            return None, f"Unexpected fetch error: {err}"

    def extract_with_trafilatura(self, html_text: str, url: str) -> Optional[str]:
        """Extract article text using Trafilatura."""
        try:
            extracted = trafilatura.extract(
                html_text,
                url=url,
                include_comments=False,
                include_tables=False,
                no_fallback=False,
                output_format="txt",
            )
            if extracted and len(extracted.strip()) >= 80:
                return extracted.strip()
        except Exception as err:
            logger.debug("Trafilatura extraction failed for %s: %s", url, err)
        return None

    def extract_with_beautifulsoup(self, html_text: str) -> Optional[str]:
        """Fallback: Extract article body paragraphs using BeautifulSoup heuristics."""
        try:
            soup = BeautifulSoup(html_text, "html.parser")

            # Remove noisy elements
            for tag in soup(["script", "style", "nav", "header", "footer", "aside", "noscript", "form", "svg"]):
                tag.decompose()

            # Prefer semantic article/main containers
            container = (
                soup.find("article")
                or soup.find("main")
                or soup.find("div", class_=lambda c: c and any(k in c.lower() for k in ("article", "story-body", "post-content", "entry-content")))
                or soup.body
            )

            if container:
                paragraphs = [p.get_text(separator=" ", strip=True) for p in container.find_all("p")]
                meaningful_paragraphs = [p for p in paragraphs if len(p) > 30]
                if meaningful_paragraphs:
                    text = "\n\n".join(meaningful_paragraphs)
                    if len(text) >= 80:
                        return text
        except Exception as err:
            logger.debug("BeautifulSoup fallback extraction failed: %s", err)
        return None

    @classmethod
    def extract_html_image(cls, html_text: str) -> Optional[str]:
        """Extract lead article image URL from OpenGraph, Twitter, or link tags."""
        try:
            soup = BeautifulSoup(html_text, "html.parser")
            # 1. og:image
            og_tag = (
                soup.find("meta", property="og:image")
                or soup.find("meta", attrs={"name": "og:image"})
                or soup.find("meta", property="og:image:url")
            )
            if og_tag and og_tag.get("content"):
                url = og_tag["content"].strip()
                if url.startswith(("http://", "https://")):
                    return url

            # 2. twitter:image / twitter:image:src
            tw_tag = (
                soup.find("meta", attrs={"name": "twitter:image"})
                or soup.find("meta", attrs={"name": "twitter:image:src"})
                or soup.find("meta", property="twitter:image")
            )
            if tw_tag and tw_tag.get("content"):
                url = tw_tag["content"].strip()
                if url.startswith(("http://", "https://")):
                    return url

            # 3. link rel="image_src"
            link_img = soup.find("link", rel="image_src")
            if link_img and link_img.get("href"):
                url = link_img["href"].strip()
                if url.startswith(("http://", "https://")):
                    return url
        except Exception as err:
            logger.debug("HTML image extraction error: %s", err)
        return None

    def extract_article(
        self,
        url: str,
        fallback_text: str = "",
        existing_image_url: Optional[str] = None,
    ) -> Tuple[str, bool, Optional[str]]:
        """Extract article content and image URL from the target web page.

        Returns:
            Tuple of (extracted_body, success_flag, image_url)
        """
        html_text, error = self.fetch_html(url)
        if not html_text:
            logger.warning("Article extraction failed for %s: %s", url, error)
            return fallback_text, False, existing_image_url

        # Extract image if not already resolved or to find higher-res og:image
        extracted_image = self.extract_html_image(html_text)
        final_image = extracted_image or existing_image_url

        # Stage 1: Trafilatura
        extracted = self.extract_with_trafilatura(html_text, url)
        if extracted:
            logger.debug("Extracted article via Trafilatura (%d chars): %s", len(extracted), url)
            return extracted, True, final_image

        # Stage 2: BeautifulSoup
        extracted = self.extract_with_beautifulsoup(html_text)
        if extracted:
            logger.debug("Extracted article via BeautifulSoup fallback (%d chars): %s", len(extracted), url)
            return extracted, True, final_image

        # Stage 3: Keep RSS summary fallback
        logger.warning(
            "Article extraction yielded no usable body for %s. Preserving RSS summary.",
            url,
        )
        return fallback_text, False, final_image

    def extract_content(self, url: str, fallback_text: str = "") -> Tuple[str, bool]:
        """Execute the content extraction chain for backwards compatibility.

        Returns:
            Tuple of (extracted_text, success_flag)
        """
        body, success, _ = self.extract_article(url, fallback_text=fallback_text)
        return body, success
