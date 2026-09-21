"""Domain models representing MongoDB document schemas in the News Pulse system."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def utc_now() -> datetime:
    """Return the current time in UTC."""
    return datetime.now(timezone.utc)


@dataclass
class Article:
    """Represents a normalized news article document in the 'articles' collection."""
    title: str
    source: str
    url: str
    published_at: datetime
    summary: str = ""
    content: str = ""
    image_url: Optional[str] = None
    category: str = "General"
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    cluster_id: Optional[str] = None
    id: Optional[str] = None  # MongoDB _id representation

    def to_doc(self) -> Dict[str, Any]:
        """Convert domain model to MongoDB document dictionary.
        
        Fields match the assessment requirements and product enhancements:
        - title
        - summary
        - content
        - source
        - url
        - publishedAt
        - createdAt
        - updatedAt
        - clusterId
        - imageUrl
        - category
        """
        doc = {
            "title": self.title,
            "summary": self.summary,
            "content": self.content,
            "source": self.source,
            "url": self.url,
            "publishedAt": self.published_at,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at,
            "clusterId": self.cluster_id,
            "imageUrl": self.image_url,
            "category": self.category,
        }
        if self.id:
            doc["_id"] = self.id
        return doc

    @classmethod
    def from_doc(cls, doc: Dict[str, Any]) -> "Article":
        """Reconstruct an Article model from a MongoDB document."""
        return cls(
            title=doc.get("title", ""),
            summary=doc.get("summary", ""),
            content=doc.get("content", ""),
            source=doc.get("source", ""),
            url=doc.get("url", ""),
            published_at=doc.get("publishedAt", utc_now()),
            image_url=doc.get("imageUrl") or doc.get("image_url"),
            category=doc.get("category", "General"),
            created_at=doc.get("createdAt", utc_now()),
            updated_at=doc.get("updatedAt", utc_now()),
            cluster_id=doc.get("clusterId"),
            id=str(doc["_id"]) if "_id" in doc else None,
        )


@dataclass
class Cluster:
    """Represents a topic cluster document in the 'clusters' collection."""
    label: str
    start_time: datetime
    end_time: datetime
    article_count: int = 0
    created_at: datetime = field(default_factory=utc_now)
    id: Optional[str] = None

    def to_doc(self) -> Dict[str, Any]:
        """Convert domain model to MongoDB document dictionary."""
        from bson import ObjectId
        doc = {
            "label": self.label,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "articleCount": self.article_count,
            "createdAt": self.created_at,
        }
        if self.id:
            doc["_id"] = ObjectId(self.id) if isinstance(self.id, str) else self.id
        return doc


@dataclass
class IngestionJob:
    """Represents an ingestion run record in the 'ingestion_jobs' collection."""
    job_id: str
    status: str = "pending"  # pending, running, completed, failed
    started_at: datetime = field(default_factory=utc_now)
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    feeds_attempted: int = 0
    feeds_succeeded: int = 0
    feeds_failed: int = 0
    articles_fetched: int = 0
    articles_added: int = 0
    duplicates_skipped: int = 0
    extraction_failures: int = 0
    clusters_updated: int = 0
    id: Optional[str] = None

    def to_doc(self) -> Dict[str, Any]:
        """Convert domain model to MongoDB document dictionary."""
        doc = {
            "jobId": self.job_id,
            "status": self.status,
            "startedAt": self.started_at,
            "completedAt": self.completed_at,
            "error": self.error,
            "feedsAttempted": self.feeds_attempted,
            "feedsSucceeded": self.feeds_succeeded,
            "feedsFailed": self.feeds_failed,
            "articlesFetched": self.articles_fetched,
            "articlesAdded": self.articles_added,
            "duplicatesSkipped": self.duplicates_skipped,
            "extractionFailures": self.extraction_failures,
            "clustersUpdated": self.clusters_updated,
        }
        if self.id:
            doc["_id"] = self.id
        return doc
