"""Backfill script to populate category and imageUrl for existing articles in MongoDB."""

import logging
from pymongo import MongoClient
from bs4 import BeautifulSoup
import requests
from config import Config
from processing.categorizer import ArticleCategorizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("news-pulse.backfill")


def backfill() -> None:
    logger.info("Connecting to MongoDB database...")
    client = MongoClient(Config.MONGODB_URI)
    db = client.get_default_database()
    articles_col = db["articles"]

    articles = list(articles_col.find())
    logger.info("Found %d articles to inspect for backfilling...", len(articles))

    updated_categories = 0
    updated_images = 0

    headers = {
        "User-Agent": Config.SCRAPER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    for i, doc in enumerate(articles, 1):
        doc_id = doc["_id"]
        title = doc.get("title", "")
        summary = doc.get("summary", "")
        url = doc.get("url", "")
        existing_cat = doc.get("category")
        existing_img = doc.get("imageUrl") or doc.get("image_url")

        # 1. Category backfill / refresh
        new_cat = ArticleCategorizer.classify(title, summary)
        update_fields = {}

        if not existing_cat or existing_cat == "General" and new_cat != "General":
            update_fields["category"] = new_cat
            updated_categories += 1
        elif not existing_cat:
            update_fields["category"] = new_cat
            updated_categories += 1

        # 2. Image URL extraction if missing
        if not existing_img and url:
            try:
                r = requests.get(url, headers=headers, timeout=5)
                if r.status_code == 200:
                    soup = BeautifulSoup(r.text, "html.parser")
                    # og:image
                    og = (
                        soup.find("meta", property="og:image")
                        or soup.find("meta", attrs={"name": "og:image"})
                        or soup.find("meta", property="og:image:url")
                    )
                    img_url = og.get("content", "").strip() if og else ""
                    if not img_url:
                        # twitter:image
                        tw = soup.find("meta", attrs={"name": "twitter:image"}) or soup.find("meta", property="twitter:image")
                        img_url = tw.get("content", "").strip() if tw else ""
                    if not img_url:
                        link_img = soup.find("link", rel="image_src")
                        img_url = link_img.get("href", "").strip() if link_img else ""

                    if img_url and img_url.startswith(("http://", "https://")):
                        update_fields["imageUrl"] = img_url
                        updated_images += 1
            except Exception as err:
                logger.debug("Could not fetch image for %s: %s", url, err)

        if update_fields:
            articles_col.update_one({"_id": doc_id}, {"$set": update_fields})

        if i % 15 == 0 or i == len(articles):
            logger.info("Processed %d/%d articles... (images: +%d, categories: +%d)", i, len(articles), updated_images, updated_categories)

    logger.info("Backfill complete! Updated %d categories and %d images.", updated_categories, updated_images)


if __name__ == "__main__":
    backfill()
