import { IIngestionRunner } from './ingestion.interface';
import { config } from '../../config';

/**
 * Cloud deployment runner: invokes an external Python ingestion service over HTTP.
 * Attaches shared secret authentication via X-Ingestion-Secret header without logging secrets.
 */
export class HttpIngestionRunner implements IIngestionRunner {
  async trigger(jobId: string): Promise<void> {
    if (!config.scraperServiceUrl) {
      throw new Error(
        'SCRAPER_SERVICE_URL environment variable is required when SCRAPER_MODE=http.'
      );
    }

    let baseUrl = config.scraperServiceUrl.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `http://${baseUrl}`;
    }
    const targetUrl = `${baseUrl}/run`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.ingestionServiceSecret) {
      headers['X-Ingestion-Secret'] = config.ingestionServiceSecret;
      headers['Authorization'] = `Bearer ${config.ingestionServiceSecret}`;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jobId }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(
        `Scraper service rejected request with HTTP ${res.status}: ${errorText || res.statusText}`
      );
    }
  }
}
