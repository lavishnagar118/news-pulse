import { Request, Response, NextFunction } from 'express';
import { ingestionJobService } from '../services/job.service';
import { IngestionJobStatusDto, IngestionTriggerDto } from '../types';

export class IngestController {
  /**
   * POST /ingest/trigger
   * Triggers an ingestion scraper execution asynchronously and returns HTTP 202 Accepted.
   */
  async triggerIngest(
    req: Request,
    res: Response<IngestionTriggerDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const force = req.body?.force === true || req.query?.force === 'true';
      const result = await ingestionJobService.triggerIngestion(force);

      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ingest/status/:jobId
   * Returns current status, timestamps, and stats for the specified ingestion job.
   */
  async getIngestStatus(
    req: Request,
    res: Response<IngestionJobStatusDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { jobId } = req.params;
      const status = await ingestionJobService.getJobStatus(jobId);

      res.status(200).json(status);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /ingest/latest
   * Returns status and stats for the most recent ingestion job, or 200 with placeholder if none.
   */
  async getLatestIngest(
    _req: Request,
    res: Response<IngestionJobStatusDto | { message: string }>,
    next: NextFunction
  ): Promise<void> {
    try {
      const job = await ingestionJobService.getLatestCompletedJob();
      if (!job) {
        res.status(200).json({ message: 'No ingestion runs recorded yet' });
        return;
      }
      res.status(200).json(job);
    } catch (error) {
      next(error);
    }
  }
}

export const ingestController = new IngestController();
