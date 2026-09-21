"""Lightweight FastAPI HTTP service exposing asynchronous news ingestion and clustering for cloud deployments."""

import hmac
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, Header, HTTPException, status
from pydantic import BaseModel, Field

from config import Config
from database.connection import DatabaseManager
from main import IngestionPipeline

# Configure logger (never logs authentication secrets)
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("news-pulse.scraper.server")

app = FastAPI(
    title="News Pulse Ingestion & Clustering Service",
    description="Asynchronous cloud worker service triggering RSS ingestion, normalization, and deterministic TF-IDF clustering.",
    version="1.0.0",
)

db_manager = DatabaseManager()


class IngestRunRequest(BaseModel):
    jobId: str = Field(..., min_length=1, description="Unique tracking identifier for the ingestion run")


class IngestRunResponse(BaseModel):
    jobId: str
    status: str = "accepted"


def verify_secret(x_ingestion_secret: Optional[str], authorization: Optional[str]) -> bool:
    """Validate incoming secret against configured INGESTION_SERVICE_SECRET.
    Never logs the secret content.
    """
    configured_secret = Config.INGESTION_SERVICE_SECRET.strip()
    if not configured_secret:
        # In local development if secret is not set, allow execution with warning
        logger.debug("INGESTION_SERVICE_SECRET not configured; permitting unauthenticated request in dev mode.")
        return True

    provided_secret = None
    if x_ingestion_secret:
        provided_secret = x_ingestion_secret.strip()
    elif authorization and authorization.startswith("Bearer "):
        provided_secret = authorization.split("Bearer ", 1)[1].strip()

    if not provided_secret:
        return False

    return hmac.compare_digest(provided_secret.encode("utf-8"), configured_secret.encode("utf-8"))


def run_pipeline_task(job_id: str) -> None:
    """Background task invoking the existing ingestion and deterministic topic clustering pipeline."""
    logger.info("Executing background ingestion pipeline for Job ID: %s", job_id)
    pipeline = IngestionPipeline()
    try:
        pipeline.run(job_id=job_id)
        logger.info("Background ingestion pipeline completed successfully for Job ID: %s", job_id)
    except Exception as exc:
        logger.error("Background ingestion pipeline failed for Job ID %s: %s", job_id, exc)


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Liveness probe verifying service readiness and MongoDB connectivity."""
    db_connected = False
    try:
        db = db_manager.connect()
        ping_res = db.command("ping")
        db_connected = ping_res.get("ok", 0) == 1
    except Exception as err:
        logger.warning("Health check MongoDB ping failed: %s", err)
        db_connected = False

    res_body = {
        "status": "healthy" if db_connected else "degraded",
        "service": "news-pulse-scraper",
        "database": "connected" if db_connected else "disconnected",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if not db_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=res_body,
        )

    return res_body


@app.post(
    "/run",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=IngestRunResponse,
)
def trigger_run(
    req: IngestRunRequest,
    background_tasks: BackgroundTasks,
    x_ingestion_secret: Optional[str] = Header(None, alias="X-Ingestion-Secret"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """Trigger the RSS ingestion and topic clustering pipeline asynchronously.
    Requires shared secret authentication via X-Ingestion-Secret or Authorization header.
    Returns HTTP 202 Accepted immediately.
    """
    if not verify_secret(x_ingestion_secret, authorization):
        logger.warning("Rejected unauthenticated ingestion request for jobId: %s", req.jobId)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHORIZED", "message": "Missing or invalid ingestion service secret."}},
        )

    logger.info("Accepted ingestion request for Job ID: %s", req.jobId)
    background_tasks.add_task(run_pipeline_task, req.jobId)

    return IngestRunResponse(jobId=req.jobId, status="accepted")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host=Config.HOST, port=Config.PORT, reload=False)
