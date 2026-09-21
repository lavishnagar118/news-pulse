"""MongoDB connection manager and collection operations using PyMongo."""

import logging
from typing import Dict, List, Optional, Set
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError, PyMongoError
from .models import Article, Cluster, IngestionJob, utc_now
try:
    from config import Config
except ImportError:
    from ..config import Config

logger = logging.getLogger("news-pulse.scraper.db")


class DatabaseManager:
    """Manages MongoDB connection, collections, indexes, and queries."""

    def __init__(self, uri: Optional[str] = None):
        self.uri = uri or Config.MONGODB_URI
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None

    def connect(self) -> Database:
        """Establish connection to MongoDB and return the active Database instance."""
        if self.db is None or self.client is None:
            try:
                self.client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
                # Verify server connectivity
                self.client.admin.command("ping")
                default_db_name = "news_pulse"
                parsed_db = self.client.get_default_database()
                self.db = parsed_db if parsed_db is not None else self.client[default_db_name]
                logger.info("Connected to MongoDB successfully: %s", self.db.name)
            except PyMongoError as err:
                logger.error("Failed to connect to MongoDB: %s", err)
                raise
        return self.db

    def close(self) -> None:
        """Close the MongoDB client connection."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None
            logger.info("Closed MongoDB connection.")

    @property
    def articles(self) -> Collection:
        """Accessor for the 'articles' collection."""
        return self.connect()["articles"]

    @property
    def ingestion_jobs(self) -> Collection:
        """Accessor for the 'ingestion_jobs' collection."""
        return self.connect()["ingestion_jobs"]

    @property
    def clusters(self) -> Collection:
        """Accessor for the 'clusters' collection."""
        return self.connect()["clusters"]

    def ensure_indexes(self) -> None:
        """Create required MongoDB indexes for deduplication and query performance:
        - articles: unique 'url', 'source', 'publishedAt' (descending), 'clusterId'
        - ingestion_jobs: unique 'jobId', 'status', 'startedAt' (descending)
        - clusters: 'startTime' (descending), 'endTime' (descending)
        """
        db = self.connect()
        try:
            # Articles indexes
            db.articles.create_index([("url", ASCENDING)], unique=True, name="idx_articles_url_unique")
            db.articles.create_index([("source", ASCENDING)], name="idx_articles_source")
            db.articles.create_index([("publishedAt", DESCENDING)], name="idx_articles_published_at")
            db.articles.create_index([("clusterId", ASCENDING)], name="idx_articles_cluster_id")
            db.articles.create_index([("category", ASCENDING)], name="idx_articles_category")

            # Ingestion jobs indexes
            db.ingestion_jobs.create_index([("jobId", ASCENDING)], unique=True, name="idx_jobs_job_id_unique")
            db.ingestion_jobs.create_index([("status", ASCENDING)], name="idx_jobs_status")
            db.ingestion_jobs.create_index([("startedAt", DESCENDING)], name="idx_jobs_started_at")

            # Clusters indexes
            db.clusters.create_index([("startTime", DESCENDING)], name="idx_clusters_start_time")
            db.clusters.create_index([("endTime", DESCENDING)], name="idx_clusters_end_time")

            logger.info("MongoDB indexes verified / created successfully.")
        except PyMongoError as err:
            logger.error("Error creating MongoDB indexes: %s", err)
            raise

    def get_existing_urls(self, urls: List[str]) -> Set[str]:
        """Find which of the given URLs already exist in the database.
        Allows bulk duplicate pre-filtering to avoid unnecessary extraction downloads.
        """
        if not urls:
            return set()
        try:
            cursor = self.articles.find(
                {"url": {"$in": urls}},
                projection={"url": 1, "_id": 0}
            )
            return {doc["url"] for doc in cursor if "url" in doc}
        except PyMongoError as err:
            logger.error("Failed to query existing article URLs: %s", err)
            raise

    def insert_article(self, article: Article) -> bool:
        """Insert a normalized article into MongoDB.
        
        Returns:
            True if newly inserted, False if skipped due to unique URL constraint.
        """
        try:
            self.articles.insert_one(article.to_doc())
            return True
        except DuplicateKeyError:
            # Tolerates race conditions or concurrent ingestion runs gracefully
            logger.debug("DuplicateKeyError caught for URL: %s", article.url)
            return False
        except PyMongoError as err:
            logger.error("Failed to insert article '%s' (%s): %s", article.title, article.url, err)
            raise

    def upsert_job(self, job: IngestionJob) -> None:
        """Insert or update an ingestion job record."""
        try:
            self.ingestion_jobs.update_one(
                {"jobId": job.job_id},
                {"$set": job.to_doc()},
                upsert=True
            )
        except PyMongoError as err:
            logger.warning("Failed to update ingestion job status for %s: %s", job.job_id, err)

    def get_all_articles(self) -> List[Article]:
        """Retrieve all stored articles from MongoDB sorted by publishedAt descending."""
        try:
            cursor = self.articles.find().sort("publishedAt", DESCENDING)
            return [Article.from_doc(doc) for doc in cursor]
        except PyMongoError as err:
            logger.error("Failed to retrieve articles from MongoDB: %s", err)
            raise

    def replace_clusters(
        self,
        clusters: List[Cluster],
        article_cluster_map: Dict[str, str],
    ) -> None:
        """Perform controlled bulk replacement of existing clusters and bulk update of member articles.
        
        Uses sequential delete_many, insert_many, and bulk_write operations;
        multi-document transactional guarantees across collections are not currently used.
        """
        from pymongo import UpdateOne
        from bson import ObjectId

        db = self.connect()
        try:
            # 1. Delete previous clusters
            delete_result = self.clusters.delete_many({})
            logger.info("Cleared %d old cluster documents from MongoDB.", delete_result.deleted_count)

            # 2. Insert new clusters
            if clusters:
                cluster_docs = [c.to_doc() for c in clusters]
                insert_result = self.clusters.insert_many(cluster_docs)
                logger.info("Inserted %d new cluster documents into MongoDB.", len(insert_result.inserted_ids))

            # 3. Update articles with their newly assigned clusterId in bulk
            operations = []
            now = utc_now()
            for art_id, clust_id in article_cluster_map.items():
                if not art_id:
                    continue
                try:
                    obj_id = ObjectId(art_id)
                    operations.append(
                        UpdateOne(
                            {"_id": obj_id},
                            {"$set": {"clusterId": str(clust_id), "updatedAt": now}}
                        )
                    )
                except Exception as err:
                    logger.warning("Failed preparing update for article %s: %s", art_id, err)

            if operations:
                bulk_result = self.articles.bulk_write(operations, ordered=False)
                logger.info(
                    "Updated clusterId on %d articles in MongoDB.",
                    bulk_result.modified_count,
                )

        except PyMongoError as err:
            logger.error("Error persisting clusters to MongoDB: %s", err)
            raise
