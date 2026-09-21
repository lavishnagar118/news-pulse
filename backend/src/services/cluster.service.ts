import { ObjectId } from 'mongodb';
import { getClustersCollection, getArticlesCollection } from '../db';
import { ClusterSummaryDto, ClusterDetailDto, ArticleSummaryDto } from '../types';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class ClusterService {
  /**
   * Helper to validate a 24-character hexadecimal MongoDB ObjectId string.
   */
  public isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id) && ObjectId.isValid(id);
  }

  /**
   * Retrieve all topic clusters from MongoDB ordered by startTime descending.
   * Projection ensures large article content is not queried.
   */
  async getAllClusters(limit?: number, offset?: number): Promise<ClusterSummaryDto[]> {
    const collection = getClustersCollection();
    let cursor = collection
      .find({}, { projection: { _id: 1, label: 1, articleCount: 1, startTime: 1, endTime: 1 } })
      .sort({ startTime: -1 });

    if (typeof offset === 'number' && offset > 0) {
      cursor = cursor.skip(offset);
    }
    if (typeof limit === 'number' && limit > 0) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor.toArray();

    return docs.map((doc) => ({
      id: doc._id!.toString(),
      label: doc.label,
      articleCount: doc.articleCount,
      startTime: doc.startTime instanceof Date ? doc.startTime.toISOString() : new Date(doc.startTime).toISOString(),
      endTime: doc.endTime instanceof Date ? doc.endTime.toISOString() : new Date(doc.endTime).toISOString(),
    }));
  }

  /**
   * Retrieve detailed cluster view from MongoDB, including its aggregated articles.
   * Throws BadRequestError if id is malformed, or NotFoundError if cluster does not exist.
   */
  async getClusterById(id: string): Promise<ClusterDetailDto> {
    if (!this.isValidObjectId(id)) {
      throw new BadRequestError('Invalid cluster ID format');
    }

    const clusterCollection = getClustersCollection();
    const cluster = await clusterCollection.findOne({ _id: new ObjectId(id) });

    if (!cluster) {
      throw new NotFoundError('Cluster not found');
    }

    // Query member articles by clusterId (stored as hex string)
    const articlesCollection = getArticlesCollection();
    const articlesCursor = await articlesCollection
      .find(
        { clusterId: id },
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
      .toArray();

    const articles: ArticleSummaryDto[] = articlesCursor.map((art) => ({
      id: art._id!.toString(),
      title: art.title,
      summary: art.summary || null,
      source: art.source,
      url: art.url,
      publishedAt: art.publishedAt instanceof Date ? art.publishedAt.toISOString() : new Date(art.publishedAt).toISOString(),
      imageUrl: art.imageUrl || null,
      category: art.category || 'General',
      clusterId: art.clusterId || null,
    }));

    return {
      id: cluster._id!.toString(),
      label: cluster.label,
      articleCount: cluster.articleCount,
      startTime: cluster.startTime instanceof Date ? cluster.startTime.toISOString() : new Date(cluster.startTime).toISOString(),
      endTime: cluster.endTime instanceof Date ? cluster.endTime.toISOString() : new Date(cluster.endTime).toISOString(),
      articles,
    };
  }
}

export const clusterService = new ClusterService();
