import { IngestionJobDoc, IngestionJobStatusDto, IngestionTriggerDto } from '../types';
import { getIngestionJobsCollection } from '../db';
import { getIngestionRunner, IIngestionRunner } from './ingestion';
import { ConcurrentJobError, NotFoundError } from '../utils/errors';

export class IngestionJobService {
  private runnerOverride?: IIngestionRunner;

  /**
   * Optional setter for test mocking.
   */
  public setRunner(runner: IIngestionRunner): void {
    this.runnerOverride = runner;
  }

  /**
   * Trigger an asynchronous scraper run and insert a new ingestion job document in MongoDB.
   * Concurrency guard checks for currently queued/running jobs within the last 10 minutes.
   * Returns HTTP 202 payload with unique jobId and 'queued' status.
   */
  async triggerIngestion(force: boolean = false): Promise<IngestionTriggerDto> {
    const collection = getIngestionJobsCollection();

    // Concurrency guard: check for active jobs in the last 10 minutes
    if (!force) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const activeJobs = await collection
        .find({ status: { $in: ['queued', 'running'] } })
        .sort({ startedAt: -1 })
        .toArray();

      const activeJob = activeJobs.find((job) => {
        const jobTime =
          job.startedAt instanceof Date ? job.startedAt.getTime() : new Date(job.startedAt).getTime();
        return !isNaN(jobTime) && jobTime > tenMinutesAgo.getTime();
      });

      if (activeJob) {
        throw new ConcurrentJobError(activeJob.jobId);
      }
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const jobDoc: IngestionJobDoc = {
      jobId,
      status: 'queued',
      startedAt: new Date(),
      completedAt: null,
      error: null,
      articlesFetched: 0,
      articlesAdded: 0,
      duplicatesSkipped: 0,
      extractionFailures: 0,
      feedsAttempted: 0,
      feedsSucceeded: 0,
      feedsFailed: 0,
      clustersUpdated: 0,
    };

    // Insert record in MongoDB
    await collection.insertOne(jobDoc);

    // Trigger runner asynchronously (subprocess or HTTP)
    const runner = this.runnerOverride || getIngestionRunner();
    runner.trigger(jobId).catch(async (err) => {
      console.error(`[IngestionJobService] Failed to trigger runner for ${jobId}:`, err);
      await collection.updateOne(
        { jobId },
        {
          $set: {
            status: 'failed',
            error: err.message || 'Failed to trigger ingestion runner',
            completedAt: new Date(),
          },
        }
      );
    });

    return { jobId, status: 'queued' };
  }

  /**
   * Retrieve the status of a specific ingestion job by jobId.
   * Throws NotFoundError if jobId does not exist.
   */
  async getJobStatus(jobId: string): Promise<IngestionJobStatusDto> {
    const collection = getIngestionJobsCollection();
    const job = await collection.findOne({ jobId });

    if (!job) {
      throw new NotFoundError('Ingestion job not found');
    }

    return {
      jobId: job.jobId,
      status: job.status,
      startedAt:
        job.startedAt instanceof Date ? job.startedAt.toISOString() : new Date(job.startedAt).toISOString(),
      completedAt: job.completedAt
        ? job.completedAt instanceof Date
          ? job.completedAt.toISOString()
          : new Date(job.completedAt).toISOString()
        : null,
      error: job.error || null,
      stats: {
        articlesFetched: job.articlesFetched ?? 0,
        articlesAdded: job.articlesAdded ?? 0,
        duplicatesSkipped: job.duplicatesSkipped ?? 0,
        extractionFailures: job.extractionFailures ?? 0,
        feedsAttempted: job.feedsAttempted ?? 0,
        feedsSucceeded: job.feedsSucceeded ?? 0,
        feedsFailed: job.feedsFailed ?? 0,
        clustersUpdated: job.clustersUpdated ?? 0,
      },
    };
  }

  /**
   * Retrieve the most recent completed or latest ingestion job.
   * Returns null if no jobs exist yet.
   */
  async getLatestCompletedJob(): Promise<IngestionJobStatusDto | null> {
    const collection = getIngestionJobsCollection();
    let job = await collection.findOne({ status: 'completed' }, { sort: { completedAt: -1 } });
    if (!job) {
      job = await collection.findOne({}, { sort: { startedAt: -1 } });
    }

    if (!job) {
      return null;
    }

    return {
      jobId: job.jobId,
      status: job.status,
      startedAt:
        job.startedAt instanceof Date ? job.startedAt.toISOString() : new Date(job.startedAt).toISOString(),
      completedAt: job.completedAt
        ? job.completedAt instanceof Date
          ? job.completedAt.toISOString()
          : new Date(job.completedAt).toISOString()
        : null,
      error: job.error || null,
      stats: {
        articlesFetched: job.articlesFetched ?? 0,
        articlesAdded: job.articlesAdded ?? 0,
        duplicatesSkipped: job.duplicatesSkipped ?? 0,
        extractionFailures: job.extractionFailures ?? 0,
        feedsAttempted: job.feedsAttempted ?? 0,
        feedsSucceeded: job.feedsSucceeded ?? 0,
        feedsFailed: job.feedsFailed ?? 0,
        clustersUpdated: job.clustersUpdated ?? 0,
      },
    };
  }
}

export const ingestionJobService = new IngestionJobService();
