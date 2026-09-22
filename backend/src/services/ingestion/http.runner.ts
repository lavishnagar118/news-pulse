import { IIngestionRunner } from './ingestion.interface';
import { config } from '../../config';
import { getDb } from '../../db';

/**
 * Cloud deployment runner: invokes an external Python ingestion service over HTTP.
 * Dynamically resolves scraper public URL from MongoDB service_registry or config,
 * supports Render cold-start spin-up times, and attaches shared secret authentication.
 */
export class HttpIngestionRunner implements IIngestionRunner {
  private async resolveBaseUrl(): Promise<string> {
    // 1. Check if MongoDB service_registry has the scraper service's live public URL
    try {
      const db = getDb();
      const registry = await db
        .collection<{ _id: string; url: string }>('service_registry')
        .findOne({ _id: 'news-pulse-scraper' });
      if (registry?.url && /^https?:\/\//i.test(registry.url)) {
        return registry.url.trim().replace(/\/$/, '');
      }
    } catch {
      // If service_registry is unavailable, proceed to env var fallback
    }

    // 2. Use configured scraperServiceUrl
    if (config.scraperServiceUrl && config.scraperServiceUrl.trim()) {
      let baseUrl = config.scraperServiceUrl.trim().replace(/\/$/, '');
      if (!/^https?:\/\//i.test(baseUrl)) {
        baseUrl = `http://${baseUrl}`;
      }
      return baseUrl;
    }

    throw new Error(
      'SCRAPER_SERVICE_URL environment variable is required when SCRAPER_MODE=http.'
    );
  }

  async trigger(jobId: string): Promise<void> {
    const baseUrl = await this.resolveBaseUrl();
    const targetUrl = `${baseUrl}/run`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (config.ingestionServiceSecret) {
      headers['X-Ingestion-Secret'] = config.ingestionServiceSecret;
      headers['Authorization'] = `Bearer ${config.ingestionServiceSecret}`;
    }

    // Attempt request with 90-second timeout to accommodate cloud cold starts
    let res: Response | null = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jobId }),
          signal: AbortSignal.timeout(90000),
        });

        // If service is temporarily waking up (502/503), wait and retry once
        if ((res.status === 502 || res.status === 503) && attempt === 1) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }

        break;
      } catch (err: any) {
        lastError = err;
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }
    }

    if (!res) {
      const cause = lastError?.cause ? ` (${lastError.cause.message || lastError.cause})` : '';
      throw new Error(`Failed to reach scraper service at ${targetUrl}: ${lastError?.message || 'Network failure'}${cause}`);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(
        `Scraper service at ${targetUrl} rejected request with HTTP ${res.status}: ${errorText || res.statusText}`
      );
    }
  }
}

