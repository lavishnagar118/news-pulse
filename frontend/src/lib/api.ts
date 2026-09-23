import {
  ArticleDetail,
  ArticlesResponse,
  ArticleSearchResponse,
  CategoryCount,
  ClusterDetail,
  ClusterSummary,
  IngestionJob,
  IngestionTriggerResponse,
  TimelineResponse,
} from './types';

// Read API URL from environment with localhost:5000 fallback
export const getApiBaseUrl = (): string => {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
};

/**
 * Fetch chronological timeline representation with clusters and available sources.
 * Endpoint: GET /timeline
 */
export async function fetchTimeline(options?: {
  sources?: string[];
  startDate?: string;
  endDate?: string;
  sort?: 'asc' | 'desc';
}): Promise<TimelineResponse> {
  const queryParams = new URLSearchParams();

  if (options?.sources && options.sources.length > 0) {
    queryParams.append('source', options.sources.join(','));
  }
  if (options?.startDate) {
    queryParams.append('startDate', options.startDate);
  }
  if (options?.endDate) {
    queryParams.append('endDate', options.endDate);
  }
  if (options?.sort) {
    queryParams.append('sort', options.sort);
  }

  const queryString = queryParams.toString();
  const url = `${getApiBaseUrl()}/timeline${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch timeline (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch topic clusters sorted by startTime descending.
 * Endpoint: GET /clusters
 */
export async function fetchClusters(limit?: number): Promise<ClusterSummary[]> {
  const url = limit ? `${getApiBaseUrl()}/clusters?limit=${limit}` : `${getApiBaseUrl()}/clusters`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch clusters (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch detailed cluster view including member articles sorted chronologically.
 * Endpoint: GET /clusters/:id
 */
export async function fetchClusterById(id: string): Promise<ClusterDetail> {
  const res = await fetch(`${getApiBaseUrl()}/clusters/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch cluster detail (${res.status})`);
  }

  return res.json();
}

/**
 * Trigger an asynchronous ingestion and topic clustering run.
 * Endpoint: POST /ingest/trigger
 */
export async function triggerIngestion(force: boolean = false): Promise<IngestionTriggerResponse> {
  const res = await fetch(`${getApiBaseUrl()}/ingest/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 409) {
    // Concurrency guard active: returns existing active jobId
    const activeJobId = body?.error?.jobId;
    if (activeJobId) {
      return { jobId: activeJobId, status: 'queued' };
    }
    throw new Error('Refresh already in progress…');
  }

  if (!res.ok) {
    throw new Error("Couldn't refresh news right now. Please try again.");
  }

  return body;
}

/**
 * Poll status of a specific ingestion job by jobId.
 * Endpoint: GET /ingest/status/:jobId
 */
export async function fetchJobStatus(jobId: string): Promise<IngestionJob> {
  const res = await fetch(`${getApiBaseUrl()}/ingest/status/${jobId}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error("Couldn't refresh news right now. Please try again.");
  }

  return res.json();
}

/**
 * Poll job status until it reaches 'completed' or 'failed', or until timeout.
 */
export async function pollJobStatus(
  jobId: string,
  onUpdate?: (job: IngestionJob) => void,
  intervalMs: number = 2000,
  maxWaitMs: number = 120000
): Promise<IngestionJob> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const job = await fetchJobStatus(jobId);
    if (onUpdate) onUpdate(job);

    if (job.status === 'completed') {
      return job;
    }
    if (job.status === 'failed') {
      throw new Error("Couldn't refresh news right now. Please try again.");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Couldn't refresh news right now. Please try again.");
}

/**
 * Fetch status of the most recent completed or recorded ingestion job.
 * Endpoint: GET /ingest/latest
 */
export async function fetchLatestJobStatus(): Promise<IngestionJob | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/ingest/latest`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.jobId) return null;
    return data as IngestionJob;
  } catch {
    return null;
  }
}

/**
 * Fetch paginated list of article summaries for news feeds and categories.
 * Endpoint: GET /articles
 */
export async function fetchArticles(options?: {
  limit?: number;
  offset?: number;
  category?: string;
  source?: string;
  sort?: 'asc' | 'desc';
}): Promise<ArticlesResponse> {
  const queryParams = new URLSearchParams();

  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.offset) queryParams.append('offset', options.offset.toString());
  if (options?.category) queryParams.append('category', options.category);
  if (options?.source) queryParams.append('source', options.source);
  if (options?.sort) queryParams.append('sort', options.sort);

  const queryString = queryParams.toString();
  const url = `${getApiBaseUrl()}/articles${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch articles (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch full article detail by ID including complete body text and related stories.
 * Endpoint: GET /articles/:id
 */
export async function fetchArticleById(id: string): Promise<ArticleDetail> {
  const res = await fetch(`${getApiBaseUrl()}/articles/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch article detail (${res.status})`);
  }

  return res.json();
}

/**
 * Search articles across title, summary, source, and category.
 * Endpoint: GET /articles/search?q=...
 */
export async function searchArticles(
  query: string,
  options?: {
    category?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }
): Promise<ArticleSearchResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append('q', query);

  if (options?.category) queryParams.append('category', options.category);
  if (options?.source) queryParams.append('source', options.source);
  if (options?.limit) queryParams.append('limit', options.limit.toString());
  if (options?.offset) queryParams.append('offset', options.offset.toString());

  const url = `${getApiBaseUrl()}/articles/search?${queryParams.toString()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Search failed (${res.status})`);
  }

  return res.json();
}

/**
 * Fetch list of distinct categories and article counts.
 * Endpoint: GET /categories
 */
export async function fetchCategories(): Promise<CategoryCount[]> {
  const res = await fetch(`${getApiBaseUrl()}/categories`, { cache: 'no-store' });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Failed to fetch categories (${res.status})`);
  }

  return res.json();
}

