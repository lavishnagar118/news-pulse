"""Main entry point for running the News Pulse RSS ingestion and topic clustering pipeline."""

import argparse
import logging
import sys
import time
from typing import Dict, List, Optional

from config import Config
from feeds import DEFAULT_FEEDS, RSSFeedConfig, get_enabled_feeds
from database.connection import DatabaseManager
from database.models import Article, IngestionJob, utc_now
from ingestion.rss_parser import RSSFeedParser
from ingestion.normalizer import FeedNormalizer
from ingestion.extractor import ArticleExtractor
from processing.deduplicator import ArticleDeduplicator
from processing.clusterer import TopicClusterer

logging.basicConfig(
    level=Config.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("news-pulse.scraper")


class IngestionPipeline:
    """Orchestrates end-to-end RSS ingestion, normalization, extraction, and topic clustering."""

    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()
        self.parser = RSSFeedParser()
        self.normalizer = FeedNormalizer()
        self.extractor = ArticleExtractor()
        self.clusterer = TopicClusterer()

    def run(
        self,
        job_id: Optional[str] = None,
        feed_list: Optional[List[RSSFeedConfig]] = None,
        run_ingest: bool = True,
        run_cluster: bool = True,
    ) -> Dict[str, int]:
        """Execute the ingestion and topic clustering pipeline.

        Args:
            job_id: Optional tracking identifier for the run.
            feed_list: Optional override of feed sources.
            run_ingest: If True, executes RSS fetching, extraction, and deduplication.
            run_cluster: If True, computes and persists topic clusters across stored articles.

        Returns:
            Dictionary containing final ingestion and clustering metrics.
        """
        logger.info("============================================================")
        logger.info("Starting News Pulse Ingestion & Clustering Pipeline")
        if job_id:
            logger.info("Active Job ID: %s", job_id)
        logger.info("============================================================")

        # 1. Connect to MongoDB and guarantee index existence
        try:
            self.db.connect()
            self.db.ensure_indexes()
        except Exception as err:
            logger.critical("Database connection/indexing failed. Aborting pipeline: %s", err)
            if job_id:
                self._record_job_failure(job_id, str(err))
            raise

        start_time = time.monotonic()
        try:
            # 2. Record initial job status
            if job_id:
                job = IngestionJob(
                    job_id=job_id,
                    status="running",
                    started_at=utc_now(),
                )
                self.db.upsert_job(job)

            stats = {
                "feeds_attempted": 0,
                "feeds_succeeded": 0,
                "feeds_failed": 0,
                "articles_fetched": 0,
                "articles_added": 0,
                "duplicates_skipped": 0,
                "extraction_failures": 0,
                "clusters_updated": 0,
            }

            # --- STAGE 1: RSS INGESTION & ARTICLE EXTRACTION ---
            if run_ingest:
                active_feeds = get_enabled_feeds(feed_list)
                logger.info("Loaded %d enabled news feed sources for ingestion.", len(active_feeds))

                for feed in active_feeds:
                    stats["feeds_attempted"] += 1
                    logger.info("--- Processing Feed: %s (%s) ---", feed.name, feed.url)

                    try:
                        # Fetch and parse feed entries
                        raw_entries = self.parser.fetch_feed(feed)
                        if not raw_entries:
                            logger.warning("Feed [%s] yielded 0 entries or failed fetch.", feed.name)
                            stats["feeds_failed"] += 1
                            continue

                        stats["articles_fetched"] += len(raw_entries)

                        # Normalize into structured Article objects
                        candidate_articles = self.normalizer.normalize_batch(raw_entries, feed.name)
                        logger.info(
                            "Feed [%s]: Normalized %d valid candidates out of %d entries.",
                            feed.name,
                            len(candidate_articles),
                            len(raw_entries),
                        )

                        if not candidate_articles:
                            stats["feeds_succeeded"] += 1
                            continue

                        # Pre-filter duplicates before expensive web page extraction
                        candidate_urls = [a.url for a in candidate_articles]
                        existing_urls = self.db.get_existing_urls(candidate_urls)
                        new_articles, dupes_skipped = ArticleDeduplicator.filter_batch_duplicates(
                            candidate_articles, existing_urls
                        )
                        stats["duplicates_skipped"] += dupes_skipped

                        logger.info(
                            "Feed [%s]: %d new articles identified (%d duplicates skipped).",
                            feed.name,
                            len(new_articles),
                            dupes_skipped,
                        )

                        # Extract body content and insert new articles
                        for article in new_articles:
                            try:
                                extracted_body, extraction_ok, img_url = self.extractor.extract_article(
                                    article.url,
                                    fallback_text=article.summary,
                                    existing_image_url=article.image_url,
                                )
                                article.content = extracted_body
                                article.image_url = img_url
                                if not extraction_ok:
                                    stats["extraction_failures"] += 1

                                inserted = self.db.insert_article(article)
                                if inserted:
                                    stats["articles_added"] += 1
                                    logger.info("Inserted article: [%s] %s", article.source, article.title[:70])
                                else:
                                    stats["duplicates_skipped"] += 1
                                    logger.debug("Skipped concurrent duplicate: %s", article.url)

                            except Exception as article_err:
                                logger.warning(
                                    "Failed processing article '%s' (%s): %s",
                                    article.title[:40],
                                    article.url,
                                    article_err,
                                )

                        stats["feeds_succeeded"] += 1

                    except Exception as feed_err:
                        stats["feeds_failed"] += 1
                        logger.error("Feed [%s] failed unexpectedly during processing: %s", feed.name, feed_err, exc_info=True)

                logger.info("============================================================")
                logger.info("RSS ingestion complete")
                logger.info(
                    "Feeds: %d attempted / %d successful / %d failed",
                    stats["feeds_attempted"],
                    stats["feeds_succeeded"],
                    stats["feeds_failed"],
                )
                logger.info("Fetched: %d", stats["articles_fetched"])
                logger.info("Inserted: %d", stats["articles_added"])
                logger.info("Duplicates: %d", stats["duplicates_skipped"])
                logger.info("Extraction failures: %d", stats["extraction_failures"])
                logger.info("============================================================")

            # --- STAGE 2: DETERMINISTIC TOPIC CLUSTERING ---
            if run_cluster:
                logger.info("--- Starting Topic Clustering Stage ---")
                all_articles = self.db.get_all_articles()
                if not all_articles:
                    logger.warning("No articles in database to cluster.")
                else:
                    clusters, diagnostics = self.clusterer.cluster_and_persist(all_articles, self.db)
                    stats["clusters_updated"] = len(clusters)

                    multi_clusters = [c for c in clusters if c.article_count > 1]
                    logger.info("============================================================")
                    logger.info("Topic Clustering Complete")
                    logger.info("Total articles clustered: %d", len(all_articles))
                    logger.info("Total clusters created: %d", len(clusters))
                    logger.info("Multi-article story clusters: %d", len(multi_clusters))
                    logger.info("Singleton article clusters: %d", len(clusters) - len(multi_clusters))
                    logger.info("Similarity threshold: %.2f", self.clusterer.similarity_threshold)
                    logger.info("============================================================")

            # 3. Record completed job status in MongoDB
            if job_id:
                job = IngestionJob(
                    job_id=job_id,
                    status="completed",
                    completed_at=utc_now(),
                    feeds_attempted=stats["feeds_attempted"],
                    feeds_succeeded=stats["feeds_succeeded"],
                    feeds_failed=stats["feeds_failed"],
                    articles_fetched=stats["articles_fetched"],
                    articles_added=stats["articles_added"],
                    duplicates_skipped=stats["duplicates_skipped"],
                    extraction_failures=stats["extraction_failures"],
                    clusters_updated=stats["clusters_updated"],
                )
                self.db.upsert_job(job)

            elapsed = time.monotonic() - start_time
            logger.info("Pipeline completed successfully in %.2f seconds", elapsed)
            return stats

        except Exception as pipeline_err:
            elapsed = time.monotonic() - start_time
            logger.error("Pipeline run failed after %.2f seconds: %s", elapsed, pipeline_err, exc_info=True)
            if job_id:
                self._record_job_failure(job_id, str(pipeline_err))
            raise

    def _record_job_failure(self, job_id: str, error_msg: str) -> None:
        """Record fatal pipeline failure in ingestion_jobs collection."""
        try:
            job = IngestionJob(
                job_id=job_id,
                status="failed",
                completed_at=utc_now(),
                error=error_msg,
            )
            self.db.upsert_job(job)
        except Exception as err:
            logger.warning("Could not record job failure for %s: %s", job_id, err)


def parse_args():
    parser = argparse.ArgumentParser(description="News Pulse Ingestion and Topic Clustering Pipeline")
    parser.add_argument(
        "--job-id",
        type=str,
        default=None,
        help="Optional unique job ID to track run status in MongoDB",
    )
    parser.add_argument(
        "--cluster-only",
        action="store_true",
        help="Run only topic clustering across existing MongoDB articles",
    )
    parser.add_argument(
        "--ingest-only",
        action="store_true",
        help="Run only RSS ingestion without re-clustering",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=None,
        help="Override cosine similarity threshold for clustering",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    pipeline = IngestionPipeline()
    if args.threshold is not None:
        pipeline.clusterer.similarity_threshold = args.threshold

    run_ingest = not args.cluster_only
    run_cluster = not args.ingest_only

    try:
        pipeline.run(
            job_id=args.job_id,
            run_ingest=run_ingest,
            run_cluster=run_cluster,
        )
    except Exception as exc:
        logger.error("Pipeline terminated with fatal error: %s", exc)
        sys.exit(1)
