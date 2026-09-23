#!/usr/bin/env python3
"""Generate sanitized public bootstrap news snapshot for News Pulse frontend.

Fetches public articles, timeline, and sync stats from the production API.
Produces a lightweight, sanitized JSON snapshot at frontend/public/data/bootstrap.json
containing NO secrets, database credentials, or internal error dumps.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_BASE_URL = os.environ.get(
    "NEWS_PULSE_API_URL", "https://news-pulse-api-xyxh.onrender.com"
).rstrip("/")

ALLOWED_ARTICLE_KEYS = {
    "id",
    "title",
    "summary",
    "source",
    "url",
    "publishedAt",
    "imageUrl",
    "category",
    "clusterId",
}

ALLOWED_TIMELINE_KEYS = {
    "id",
    "label",
    "startTime",
    "endTime",
    "articleCount",
    "intensity",
    "sources",
}

ALLOWED_JOB_KEYS = {
    "jobId",
    "status",
    "startedAt",
    "completedAt",
    "error",
    "stats",
}

ALLOWED_STAT_KEYS = {
    "articlesFetched",
    "articlesAdded",
    "duplicatesSkipped",
    "extractionFailures",
    "feedsAttempted",
    "feedsSucceeded",
    "feedsFailed",
    "clustersUpdated",
}


def fetch_json(path: str, timeout: int = 30):
    url = f"{API_BASE_URL}{path}"
    headers = {
        "User-Agent": "NewsPulseBootstrapGenerator/1.0 (+https://github.com/lavishnagar118/news-pulse)",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def sanitize_article(art: dict) -> dict:
    return {k: art[k] for k in ALLOWED_ARTICLE_KEYS if k in art}


def sanitize_timeline_item(item: dict) -> dict:
    return {k: item[k] for k in ALLOWED_TIMELINE_KEYS if k in item}


def sanitize_job(job: dict) -> dict:
    if not job:
        return None
    clean_job = {k: job[k] for k in ALLOWED_JOB_KEYS if k in job}
    if "stats" in clean_job and isinstance(clean_job["stats"], dict):
        clean_job["stats"] = {
            k: clean_job["stats"][k]
            for k in ALLOWED_STAT_KEYS
            if k in clean_job["stats"]
        }
    return clean_job


def generate_bootstrap(output_path: Path):
    print(f"Generating bootstrap snapshot from {API_BASE_URL}...")

    # 1. Fetch latest ingestion job metadata
    try:
        raw_job = fetch_json("/ingest/latest")
        clean_job = sanitize_job(raw_job)
    except Exception as err:
        print(f"Warning: Could not fetch latest job info: {err}")
        clean_job = None

    # 2. Fetch public articles (generous batch for homepage + categories)
    try:
        raw_articles = fetch_json("/articles?limit=60")
        articles = [
            sanitize_article(a)
            for a in raw_articles.get("data", [])
            if isinstance(a, dict)
        ]
        total_articles = raw_articles.get("total", len(articles))
    except Exception as err:
        print(f"Error fetching articles: {err}")
        sys.exit(1)

    # 3. Fetch timeline representation
    try:
        raw_timeline = fetch_json("/timeline")
        timeline_items = [
            sanitize_timeline_item(t)
            for t in raw_timeline.get("data", [])[:50]
            if isinstance(t, dict)
        ]
        sources = raw_timeline.get("sources", ["Al Jazeera", "BBC News", "NPR News"])
    except Exception as err:
        print(f"Error fetching timeline: {err}")
        sys.exit(1)

    # 4. Determine snapshot generated timestamp
    # Use completedAt if available to preserve deterministic content when unchanged
    generated_at = None
    if clean_job and clean_job.get("completedAt"):
        generated_at = clean_job["completedAt"]
    else:
        generated_at = datetime.now(timezone.utc).isoformat()

    snapshot = {
        "generatedAt": generated_at,
        "latestSync": clean_job,
        "articles": articles,
        "totalArticles": total_articles,
        "timeline": {
            "data": timeline_items,
            "sources": sources,
        },
    }

    # 5. Write snapshot to target file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
        f.write("\n")

    size_kb = output_path.stat().st_size / 1024
    print(
        f"Successfully generated bootstrap snapshot at {output_path} "
        f"({len(articles)} articles, {len(timeline_items)} clusters, {size_kb:.1f} KB)"
    )


def main():
    root_dir = Path(__file__).resolve().parent.parent.parent
    target_path = root_dir / "frontend" / "public" / "data" / "bootstrap.json"
    generate_bootstrap(target_path)


if __name__ == "__main__":
    main()
