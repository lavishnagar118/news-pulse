import { Router } from 'express';
import { ingestController } from '../controllers/ingest.controller';

const router = Router();

// POST /ingest/trigger - Trigger ingestion run and get jobId
router.post('/trigger', (req, res, next) => ingestController.triggerIngest(req, res, next));

// GET /ingest/latest - Latest recorded ingestion job status & stats
router.get('/latest', (req, res, next) => ingestController.getLatestIngest(req, res, next));

// GET /ingest/status/:jobId - Poll status of ingestion job
router.get('/status/:jobId', (req, res, next) => ingestController.getIngestStatus(req, res, next));

export default router;
