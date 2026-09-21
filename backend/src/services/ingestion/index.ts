import { IIngestionRunner } from './ingestion.interface';
import { SubprocessIngestionRunner } from './subprocess.runner';
import { HttpIngestionRunner } from './http.runner';
import { config } from '../../config';

export * from './ingestion.interface';
export * from './subprocess.runner';
export * from './http.runner';

/**
 * Factory creating the appropriate ingestion runner based on SCRAPER_MODE.
 */
export const getIngestionRunner = (): IIngestionRunner => {
  if (config.scraperMode === 'http') {
    return new HttpIngestionRunner();
  }
  return new SubprocessIngestionRunner();
};
