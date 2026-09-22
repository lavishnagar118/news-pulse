import { Router } from 'express';
import { ingestController } from '../controllers/ingest.controller';
import { requireIngestionSecret } from '../middleware/auth';

const router = Router();

// POST /ingest/trigger - Public trigger endpoint for frontend user refresh (abuse protected by 409 concurrency lock)
router.post('/trigger', (req, res, next) => ingestController.triggerIngest(req, res, next));

// POST /ingest/scheduled - Authenticated endpoint for automated cron/background freshness (requires INGESTION_SERVICE_SECRET)
router.post('/scheduled', requireIngestionSecret, (req, res, next) => ingestController.triggerIngest(req, res, next));

// GET /ingest/latest - Latest recorded ingestion job status & stats
router.get('/latest', (req, res, next) => ingestController.getLatestIngest(req, res, next));

// GET /ingest/status/:jobId - Poll status of ingestion job
router.get('/status/:jobId', (req, res, next) => ingestController.getIngestStatus(req, res, next));

export default router;

