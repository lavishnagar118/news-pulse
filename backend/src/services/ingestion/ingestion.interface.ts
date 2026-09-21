/**
 * Strategy interface for triggering the scraper ingestion pipeline.
 * Allows seamless switching between local subprocess and cloud HTTP execution.
 */
export interface IIngestionRunner {
  /**
   * Triggers the ingestion pipeline for a given tracked job ID.
   *
   * @param jobId Unique identifier for tracking job status.
   */
  trigger(jobId: string): Promise<void>;
}
