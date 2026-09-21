import { ObjectId } from 'mongodb';

// Database Models (as stored in MongoDB)
export interface ArticleDoc {
  _id?: ObjectId;
  title: string;
  summary: string | null;
  content: string | null;
  source: string;
  url: string;
  publishedAt: Date;
  imageUrl?: string | null;
  category?: string;
  createdAt: Date;
  updatedAt?: Date;
  clusterId: string | null;
}

export interface ClusterDoc {
  _id?: ObjectId;
  label: string;
  articleCount: number;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
}

export type IngestionJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface IngestionJobDoc {
  _id?: ObjectId;
  jobId: string;
  status: IngestionJobStatus;
  startedAt: string | Date;
  completedAt: string | Date | null;
  error: string | null;
  articlesFetched?: number;
  articlesAdded?: number;
  duplicatesSkipped?: number;
  extractionFailures?: number;
  feedsAttempted?: number;
  feedsSucceeded?: number;
  feedsFailed?: number;
  clustersUpdated?: number;
}

// Aliases for compatibility
export type Article = ArticleDoc;
export type Cluster = ClusterDoc;
export type IngestionJob = IngestionJobDoc;

// API DTOs (Data Transfer Objects for HTTP responses)

export interface ArticleSummaryDto {
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

export interface ArticleDetailDto {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  source: string;
  url: string;
  publishedAt: string;
  imageUrl?: string | null;
  category: string;
  clusterId?: string | null;
  clusterLabel?: string | null;
  relatedArticles?: ArticleSummaryDto[];
}

export interface ArticlesResponseDto {
  data: ArticleSummaryDto[];
  total: number;
  limit: number;
  offset: number;
}

export interface ArticleSearchResponseDto {
  data: ArticleSummaryDto[];
  total: number;
  query: string;
  limit: number;
  offset: number;
}

export interface CategoryCountDto {
  name: string;
  count: number;
}

export interface ClusterSummaryDto {
  id: string;
  label: string;
  articleCount: number;
  startTime: string;
  endTime: string;
}

export interface ClusterDetailDto extends ClusterSummaryDto {
  articles: ArticleSummaryDto[];
}

export interface TimelineItemDto {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  articleCount: number;
  intensity: number;
  sources: string[];
}

export interface TimelineResponseDto {
  data: TimelineItemDto[];
  sources: string[];
}

export interface IngestionJobStatsDto {
  articlesFetched: number;
  articlesAdded: number;
  duplicatesSkipped: number;
  extractionFailures: number;
  feedsAttempted: number;
  feedsSucceeded: number;
  feedsFailed: number;
  clustersUpdated: number;
}

export interface IngestionJobStatusDto {
  jobId: string;
  status: IngestionJobStatus;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  stats: IngestionJobStatsDto;
}

export interface IngestionTriggerDto {
  jobId: string;
  status: 'queued';
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    jobId?: string;
    details?: any;
  };
}

export interface HealthResponseDto {
  status: 'healthy' | 'degraded';
  service: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}
