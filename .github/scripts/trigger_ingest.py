#!/usr/bin/env python3
"""Secure background freshness script for News Pulse automated ingestion.

Calls POST /ingest/trigger and polls GET /ingest/status/:jobId until completion.
Never prints or leaks secrets or authorization headers in logs.
Exits 0 on completion or safe 409 skip; exits 1 on failure or timeout.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.request

API_BASE_URL = os.environ.get(
    "NEWS_PULSE_API_URL", "https://news-pulse-api-xyxh.onrender.com"
).rstrip("/")
SECRET = (os.environ.get("INGESTION_SERVICE_SECRET") or "").strip()

POLL_INTERVAL_SEC = 5
MAX_WAIT_SEC = 120


def make_request(path: str, method: str = "GET", data: bytes = None):
    url = f"{API_BASE_URL}{path}"
    headers = {
        "User-Agent": "NewsPulseFreshnessBot/1.0 (+https://github.com/lavishnagar118/news-pulse)",
        "Accept": "application/json",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"

    # Attach secret if provided, without ever logging it
    if SECRET:
        headers["X-Ingestion-Secret"] = SECRET
        headers["Authorization"] = f"Bearer {SECRET}"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    return urllib.request.urlopen(req, timeout=30)


def main():
    print(f"Triggering automated background news ingestion via {API_BASE_URL}...")

    # 1. Trigger ingestion
    try:
        with make_request("/ingest/trigger", method="POST", data=b"{}") as resp:
            status_code = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            job_id = body.get("jobId")
            print(f"Ingestion job triggered successfully. Job ID: {job_id} (HTTP {status_code})")
    except urllib.error.HTTPError as err:
        err_body = err.read().decode("utf-8")
        if err.code == 409:
            print("Notice: An ingestion job is currently already running (HTTP 409 Conflict). Skipping concurrent run.")
            sys.exit(0)
        print(f"Error: Ingestion trigger rejected with HTTP {err.code}: {err_body}")
        sys.exit(1)
    except Exception as err:
        print(f"Error: Network failure triggering ingestion: {err}")
        sys.exit(1)

    if not job_id:
        print("Error: No jobId returned by ingestion endpoint.")
        sys.exit(1)

    # 2. Poll job status
    print(f"Monitoring job progress (polling every {POLL_INTERVAL_SEC}s, max wait {MAX_WAIT_SEC}s)...")
    start_time = time.time()

    while time.time() - start_time < MAX_WAIT_SEC:
        time.sleep(POLL_INTERVAL_SEC)
        try:
            with make_request(f"/ingest/status/{job_id}", method="GET") as resp:
                job_data = json.loads(resp.read().decode("utf-8"))
                current_status = job_data.get("status")
                elapsed = int(time.time() - start_time)

                if current_status == "completed":
                    stats = job_data.get("stats", {})
                    print("==================================================")
                    print(f"Ingestion job {job_id} completed successfully in {elapsed}s!")
                    print(f" - Feeds attempted:     {stats.get('feedsAttempted', 0)}")
                    print(f" - Feeds succeeded:     {stats.get('feedsSucceeded', 0)}")
                    print(f" - Feeds failed:        {stats.get('feedsFailed', 0)}")
                    print(f" - Articles fetched:    {stats.get('articlesFetched', 0)}")
                    print(f" - New stories added:   {stats.get('articlesAdded', 0)}")
                    print(f" - Duplicates skipped:  {stats.get('duplicatesSkipped', 0)}")
                    print(f" - Clusters updated:    {stats.get('clustersUpdated', 0)}")
                    print("==================================================")
                    sys.exit(0)

                elif current_status == "failed":
                    error_msg = job_data.get("error", "Unknown error")
                    print(f"Error: Ingestion job failed after {elapsed}s: {error_msg}")
                    sys.exit(1)

                else:
                    print(f"[{elapsed}s] Job status: {current_status}...")

        except Exception as poll_err:
            print(f"Warning: Transient polling error: {poll_err}")

    print(f"Error: Polling timed out after {MAX_WAIT_SEC}s without completion.")
    sys.exit(1)


if __name__ == "__main__":
    main()
