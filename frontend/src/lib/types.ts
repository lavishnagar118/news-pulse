// Frontend Domain Types matching Backend API Contracts

export interface Article {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string | null;
  category: string;
  clusterId?: string | null;
}

export interface ArticleDetail extends Article {
  content: string | null;
  clusterLabel?: string | null;
  relatedArticles?: Article[];
}

export interface ArticlesResponse {
  data: Article[];
  total: number;
  limit: number;
  offset: number;
}

export interface ArticleSearchResponse {
  data: Article[];
  total: number;
  query: string;
  limit: number;
  offset: number;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface ClusterSummary {
  id: string;
  label: string;
  articleCount: number;
  startTime: string;
  endTime: string;
}

export interface ClusterDetail extends ClusterSummary {
  articles: Article[];
}

export interface TimelineItem {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  articleCount: number;
  intensity: number;
  sources: string[];
}

export interface TimelineResponse {
  data: TimelineItem[];
  sources: string[];
}

export type IngestionJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface IngestionJobStats {
  articlesFetched: number;
  articlesAdded: number;
  duplicatesSkipped: number;
  extractionFailures: number;
  feedsAttempted: number;
  feedsSucceeded: number;
  feedsFailed: number;
  clustersUpdated: number;
}

export interface IngestionJob {
  jobId: string;
  status: IngestionJobStatus;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  stats: IngestionJobStats;
}

export interface IngestionTriggerResponse {
  jobId: string;
  status: 'queued';
  isConcurrent?: boolean;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    jobId?: string;
    details?: any;
  };
}

export interface TimelineFilters {
  sources: string[];
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}
