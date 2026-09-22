import { ObjectId, Filter } from 'mongodb';
import { getArticlesCollection, getClustersCollection } from '../db';
import {
  TimelineResponseDto,
  TimelineItemDto,
  ClusterDoc,
  ArticleDoc,
  ArticleSummaryDto,
  ArticleDetailDto,
  ArticlesResponseDto,
  ArticleSearchResponseDto,
  CategoryCountDto,
} from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';

export interface TimelineOptions {
  sources?: string[];
  startDate?: string;
  endDate?: string;
  sort?: 'asc' | 'desc';
  limit?: number;
}

export interface ArticleQueryOptions {
  limit?: number;
  offset?: number;
  category?: string;
  source?: string;
  sort?: 'asc' | 'desc';
  featured?: boolean;
}

export interface SearchOptions {
  category?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class ArticleService {
  /**
   * Helper to validate a 24-character hexadecimal MongoDB ObjectId string.
   */
  public isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id) && ObjectId.isValid(id);
  }

  /**
   * Retrieve distinct source names across all articles in MongoDB, sorted alphabetically.
   */
  async getSources(): Promise<string[]> {
    const collection = getArticlesCollection();
    const rawSources = await collection.distinct('source');
    return rawSources.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).sort();
  }

  /**
   * Retrieve paginated article summaries (excludes full HTML body content to keep payloads light).
   */
  async getArticles(options: ArticleQueryOptions = {}): Promise<ArticlesResponseDto> {
    const collection = getArticlesCollection();
    const filter: Filter<ArticleDoc> = {};

    if (options.category && options.category.toLowerCase() !== 'all') {
      filter.category = { $regex: new RegExp(`^${escapeRegex(options.category)}$`, 'i') };
    }

    if (options.source) {
      const sourceList = options.source.split(',').map((s) => s.trim()).filter(Boolean);
      if (sourceList.length === 1) {
        filter.source = sourceList[0];
      } else if (sourceList.length > 1) {
        filter.source = { $in: sourceList };
      }
    }

    const sortDirection = options.sort === 'asc' ? 1 : -1;
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    const [total, docs] = await Promise.all([
      collection.countDocuments(filter),
      collection
        .find(filter, {
          projection: {
            _id: 1,
            title: 1,
            summary: 1,
            source: 1,
            url: 1,
            publishedAt: 1,
            imageUrl: 1,
            category: 1,
            clusterId: 1,
          },
        })
        .sort({ publishedAt: sortDirection })
        .skip(offset)
        .limit(limit)
        .toArray(),
    ]);

    const articles: ArticleSummaryDto[] = docs.map((doc) => ({
      id: doc._id!.toString(),
      title: doc.title,
      summary: doc.summary || null,
      source: doc.source,
      url: doc.url,
      publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : new Date(doc.publishedAt).toISOString(),
      imageUrl: doc.imageUrl || null,
      category: doc.category || 'General',
      clusterId: doc.clusterId || null,
    }));

    return {
      data: articles,
      total,
      limit,
      offset,
    };
  }

  /**
   * Retrieve full article details by ID, including full body text, category,
   * cluster metadata, and related stories within the same cluster or topic.
   */
  async getArticleById(id: string): Promise<ArticleDetailDto> {
    if (!this.isValidObjectId(id)) {
      throw new BadRequestError('Invalid article ID format');
    }

    const articlesCollection = getArticlesCollection();
    const clustersCollection = getClustersCollection();

    const articleDoc = await articlesCollection.findOne({ _id: new ObjectId(id) });
    if (!articleDoc) {
      throw new NotFoundError('Article not found');
    }

    let clusterLabel: string | null = null;
    let relatedArticles: ArticleSummaryDto[] = [];

    // If assigned to a topic cluster, resolve cluster label and sibling member articles
    if (articleDoc.clusterId && this.isValidObjectId(articleDoc.clusterId)) {
      const cluster = await clustersCollection.findOne({ _id: new ObjectId(articleDoc.clusterId) });
      if (cluster) {
        clusterLabel = cluster.label;
      }

      // Query sibling articles in same cluster
      const siblings = await articlesCollection
        .find(
          { clusterId: articleDoc.clusterId, _id: { $ne: articleDoc._id } },
          {
            projection: {
              _id: 1,
              title: 1,
              summary: 1,
              source: 1,
              url: 1,
              publishedAt: 1,
              imageUrl: 1,
              category: 1,
              clusterId: 1,
            },
          }
        )
        .sort({ publishedAt: 1 })
        .limit(6)
        .toArray();

      relatedArticles = siblings.map((s) => ({
        id: s._id!.toString(),
        title: s.title,
        summary: s.summary || null,
        source: s.source,
        url: s.url,
        publishedAt: s.publishedAt instanceof Date ? s.publishedAt.toISOString() : new Date(s.publishedAt).toISOString(),
        imageUrl: s.imageUrl || null,
        category: s.category || 'General',
        clusterId: s.clusterId || null,
      }));
    }

    // Fallback: If no siblings in cluster, fetch recent articles from the same category
    if (relatedArticles.length === 0) {
      const categoryMatches = await articlesCollection
        .find(
          { category: articleDoc.category || 'General', _id: { $ne: articleDoc._id } },
          {
            projection: {
              _id: 1,
              title: 1,
              summary: 1,
              source: 1,
              url: 1,
              publishedAt: 1,
              imageUrl: 1,
              category: 1,
              clusterId: 1,
            },
          }
        )
        .sort({ publishedAt: -1 })
        .limit(4)
        .toArray();

      relatedArticles = categoryMatches.map((s) => ({
        id: s._id!.toString(),
        title: s.title,
        summary: s.summary || null,
        source: s.source,
        url: s.url,
        publishedAt: s.publishedAt instanceof Date ? s.publishedAt.toISOString() : new Date(s.publishedAt).toISOString(),
        imageUrl: s.imageUrl || null,
        category: s.category || 'General',
        clusterId: s.clusterId || null,
      }));
    }

    return {
      id: articleDoc._id!.toString(),
      title: articleDoc.title,
      summary: articleDoc.summary || null,
      content: articleDoc.content || null,
      source: articleDoc.source,
      url: articleDoc.url,
      publishedAt: articleDoc.publishedAt instanceof Date ? articleDoc.publishedAt.toISOString() : new Date(articleDoc.publishedAt).toISOString(),
      imageUrl: articleDoc.imageUrl || null,
      category: articleDoc.category || 'General',
      clusterId: articleDoc.clusterId || null,
      clusterLabel,
      relatedArticles,
    };
  }

  /**
   * Search articles across title, summary, content, source, and category.
   * Supports case-insensitive single/multi-word and quoted-phrase matching,
   * with title weighting over summary/content and word-boundary safety for acronyms.
   */
  async searchArticles(query: string, options: SearchOptions = {}): Promise<ArticleSearchResponseDto> {
    const trimmedQuery = (query || '').trim();
    if (!trimmedQuery) {
      return {
        data: [],
        total: 0,
        query: '',
        limit: Number(options.limit) || 20,
        offset: Number(options.offset) || 0,
      };
    }

    const articlesCollection = getArticlesCollection();
    const clustersCollection = getClustersCollection();

    // Check if query is wrapped in quotes for exact phrase matching
    const isQuoted =
      (trimmedQuery.startsWith('"') && trimmedQuery.endsWith('"') && trimmedQuery.length > 2) ||
      (trimmedQuery.startsWith("'") && trimmedQuery.endsWith("'") && trimmedQuery.length > 2);
    const unquoted = isQuoted ? trimmedQuery.slice(1, -1).trim() : trimmedQuery;

    // Build token regex: for short tokens (<= 3 chars, e.g. "AI", "US"), enforce word boundaries
    const buildTermRegex = (term: string) => {
      const escaped = escapeRegex(term);
      if (term.length <= 3) {
        return new RegExp(`\\b${escaped}\\b`, 'i');
      }
      return new RegExp(escaped, 'i');
    };

    // 1. Exact phrase regex (used for matching clusters & phrase boost)
    const exactRegex = buildTermRegex(unquoted);

    // 2. Identify matching clusters by exact or token match
    const matchingClusters = await clustersCollection
      .find({ label: { $regex: exactRegex } }, { projection: { _id: 1 } })
      .limit(30)
      .toArray();
    const matchingClusterIds = matchingClusters.map((c) => c._id.toString());

    // 3. Tokenize query for multi-word natural queries
    const tokens = unquoted.split(/\s+/).filter((t) => t.length > 0);

    let searchFilter: Filter<ArticleDoc>;

    if (isQuoted || tokens.length <= 1) {
      // Single term or quoted phrase search
      const orClauses: Filter<ArticleDoc>[] = [
        { title: { $regex: exactRegex } },
        { summary: { $regex: exactRegex } },
        { content: { $regex: exactRegex } },
        { source: { $regex: exactRegex } },
        { category: { $regex: exactRegex } },
      ];
      if (matchingClusterIds.length > 0) {
        orClauses.push({ clusterId: { $in: matchingClusterIds } });
      }
      searchFilter = { $or: orClauses };
    } else {
      // Meaningful multi-term query: match articles where tokens appear across fields,
      // or where the full exact phrase appears.
      const perTokenConditions: Filter<ArticleDoc>[] = tokens.map((token) => {
        const tokenRegex = buildTermRegex(token);
        return {
          $or: [
            { title: { $regex: tokenRegex } },
            { summary: { $regex: tokenRegex } },
            { content: { $regex: tokenRegex } },
            { source: { $regex: tokenRegex } },
            { category: { $regex: tokenRegex } },
          ],
        };
      });

      const multiTermAnd: Filter<ArticleDoc> = { $and: perTokenConditions };

      const exactOr: Filter<ArticleDoc> = {
        $or: [
          { title: { $regex: exactRegex } },
          { summary: { $regex: exactRegex } },
          { content: { $regex: exactRegex } },
          ...(matchingClusterIds.length > 0 ? [{ clusterId: { $in: matchingClusterIds } }] : []),
        ],
      };

      searchFilter = { $or: [exactOr, multiTermAnd] };
    }

    const filter: Filter<ArticleDoc> = { ...searchFilter };

    if (options.category && options.category.toLowerCase() !== 'all') {
      filter.category = { $regex: new RegExp(`^${escapeRegex(options.category)}$`, 'i') };
    }

    if (options.source) {
      filter.source = options.source;
    }

    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const offset = Math.max(Number(options.offset) || 0, 0);

    // Retrieve matching candidates
    const [total, docs] = await Promise.all([
      articlesCollection.countDocuments(filter),
      articlesCollection
        .find(filter, {
          projection: {
            _id: 1,
            title: 1,
            summary: 1,
            source: 1,
            url: 1,
            publishedAt: 1,
            imageUrl: 1,
            category: 1,
            clusterId: 1,
          },
        })
        .toArray(),
    ]);

    // Compute relevance score: title weighted higher than summary/content
    const scored = docs.map((doc) => {
      let score = 0;
      const titleLower = (doc.title || '').toLowerCase();
      const summaryLower = (doc.summary || '').toLowerCase();
      const unquotedLower = unquoted.toLowerCase();

      // Exact phrase match in title = highest relevance
      if (titleLower.includes(unquotedLower)) {
        score += 30;
      }
      // Exact phrase match in summary
      if (summaryLower.includes(unquotedLower)) {
        score += 15;
      }

      // Individual token matches
      for (const t of tokens) {
        const term = t.toLowerCase();
        if (titleLower.includes(term)) {
          score += 10;
        }
        if (summaryLower.includes(term)) {
          score += 4;
        }
      }

      // Bonus for source/category match
      if ((doc.source || '').toLowerCase().includes(unquotedLower)) score += 5;
      if ((doc.category || '').toLowerCase().includes(unquotedLower)) score += 5;

      return { doc, score };
    });

    // Sort by relevance score descending, then by publishedAt descending
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const timeA = a.doc.publishedAt instanceof Date ? a.doc.publishedAt.getTime() : new Date(a.doc.publishedAt).getTime();
      const timeB = b.doc.publishedAt instanceof Date ? b.doc.publishedAt.getTime() : new Date(b.doc.publishedAt).getTime();
      return timeB - timeA;
    });

    const paginated = scored.slice(offset, offset + limit).map((s) => s.doc);

    const articles: ArticleSummaryDto[] = paginated.map((doc) => ({
      id: doc._id!.toString(),
      title: doc.title,
      summary: doc.summary || null,
      source: doc.source,
      url: doc.url,
      publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : new Date(doc.publishedAt).toISOString(),
      imageUrl: doc.imageUrl || null,
      category: doc.category || 'General',
      clusterId: doc.clusterId || null,
    }));

    return {
      data: articles,
      total,
      query: trimmedQuery,
      limit,
      offset,
    };
  }

  /**
   * Retrieve list of distinct categories and their article counts.
   */
  async getCategories(): Promise<CategoryCountDto[]> {
    const collection = getArticlesCollection();
    const pipeline = [
      {
        $group: {
          _id: { $ifNull: ['$category', 'General'] },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ];

    const results = await collection.aggregate<{ _id: string; count: number }>(pipeline).toArray();
    return results.map((r) => ({
      name: r._id,
      count: r.count,
    }));
  }

  /**
   * Retrieve chronological timeline clusters formatted for visualization charts.
   * Includes cluster items with intensity (articleCount) and the list of available sources.
   */
  async getTimeline(options: TimelineOptions = {}): Promise<TimelineResponseDto> {
    const articlesCollection = getArticlesCollection();
    const clustersCollection = getClustersCollection();

    // 1. Determine cluster filter
    const clusterFilter: Filter<ClusterDoc> = {};

    // Source filtering: if sources specified, identify matching cluster IDs
    if (options.sources && options.sources.length > 0) {
      const matchingClusterIds = await articlesCollection.distinct('clusterId', {
        source: { $in: options.sources },
      });

      const validObjectIds = matchingClusterIds
        .filter((id): id is string => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id))
        .map((id) => new ObjectId(id));

      clusterFilter._id = { $in: validObjectIds };
    }

    // Date range filtering
    if (options.startDate || options.endDate) {
      clusterFilter.startTime = {};
      if (options.startDate) {
        clusterFilter.startTime.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        clusterFilter.startTime.$lte = new Date(options.endDate);
      }
    }

    // Sorting: default chronological (startTime: 1)
    const sortDirection = options.sort === 'desc' ? -1 : 1;
    let cursor = clustersCollection.find(clusterFilter).sort({ startTime: sortDirection });

    if (typeof options.limit === 'number' && options.limit > 0) {
      cursor = cursor.limit(options.limit);
    }

    const clusterDocs = await cursor.toArray();

    // Retrieve source mapping for all clustered articles
    const clusteredArticles = await articlesCollection
      .find({ clusterId: { $ne: null } }, { projection: { clusterId: 1, source: 1 } })
      .toArray();

    const clusterSourceMap = new Map<string, string[]>();
    for (const art of clusteredArticles) {
      if (art.clusterId) {
        const list = clusterSourceMap.get(art.clusterId) || [];
        if (!list.includes(art.source)) {
          list.push(art.source);
        }
        clusterSourceMap.set(art.clusterId, list);
      }
    }

    const data: TimelineItemDto[] = clusterDocs.map((doc) => {
      const clusterId = doc._id!.toString();
      return {
        id: clusterId,
        label: doc.label,
        startTime: doc.startTime instanceof Date ? doc.startTime.toISOString() : new Date(doc.startTime).toISOString(),
        endTime: doc.endTime instanceof Date ? doc.endTime.toISOString() : new Date(doc.endTime).toISOString(),
        articleCount: doc.articleCount,
        intensity: doc.articleCount,
        sources: clusterSourceMap.get(clusterId) || [],
      };
    });

    // Fetch all available sources across all articles
    const sources = await this.getSources();

    return {
      data,
      sources,
    };
  }
}

export const articleService = new ArticleService();
