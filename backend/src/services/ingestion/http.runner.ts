import { IIngestionRunner } from './ingestion.interface';
import { config } from '../../config';
import { getDb } from '../../db';

export interface HttpIngestionRunnerOptions {
  retryIntervalMs?: number;
  maxDeadlineMs?: number;
  perRequestTimeoutMs?: number;
}

/**
 * Cloud deployment runner: invokes an external Python ingestion service over HTTP.
 * Dynamically resolves scraper public URL from MongoDB service_registry or config,
 * reliably tolerates Render cold-start spin-up times via bounded retries, stops
 * immediately on permanent 4xx errors, and never leaks raw infrastructure HTML or secrets.
 */
export class HttpIngestionRunner implements IIngestionRunner {
  private readonly retryIntervalMs: number;
  private readonly maxDeadlineMs: number;
  private readonly perRequestTimeoutMs: number;

  constructor(options?: HttpIngestionRunnerOptions) {
    this.retryIntervalMs = options?.retryIntervalMs ?? 3500;
    this.maxDeadlineMs = options?.maxDeadlineMs ?? 70000;
    this.perRequestTimeoutMs = options?.perRequestTimeoutMs ?? 15000;
  }

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

    const startTime = Date.now();
    const deadline = startTime + this.maxDeadlineMs;
    let lastStatusCode: number | null = null;
    let lastError: Error | null = null;

    while (Date.now() < deadline) {
      try {
        const remainingTime = deadline - Date.now();
        const requestTimeout = Math.min(this.perRequestTimeoutMs, Math.max(remainingTime, 1000));

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jobId }),
          signal: AbortSignal.timeout(requestTimeout),
        });

        // 1. Warm service fast path (HTTP 200..299, e.g. 202 Accepted)
        if (res.status >= 200 && res.status < 300) {
          return;
        }

        lastStatusCode = res.status;

        // 2. Permanent client error: do NOT retry on 4xx (auth failures, bad requests)
        if (res.status >= 400 && res.status < 500) {
          throw new Error(
            `Scraper service authentication or configuration error (HTTP ${res.status}).`
          );
        }

        // 3. Transient cold-start status codes: 502, 503, 504
        lastError = new Error(`Scraper service waking up (HTTP ${res.status}).`);
      } catch (err: any) {
        // If permanent 4xx error was thrown above, rethrow immediately
        if (err.message && err.message.includes('Scraper service authentication or configuration error')) {
          throw err;
        }

        // Network or connection failure (ECONNRESET, ETIMEDOUT, socket hangup, abort)
        lastError = err;
      }

      // If another retry cannot fit before deadline, break out
      if (Date.now() + this.retryIntervalMs >= deadline) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, this.retryIntervalMs));
    }

    // Bounded deadline exhausted: fail cleanly with sanitized operational error
    const statusInfo = lastStatusCode ? ` (last HTTP ${lastStatusCode})` : '';
    throw new Error(
      `Scraper service did not become ready within the cold-start window${statusInfo}.`
    );
  }
}

