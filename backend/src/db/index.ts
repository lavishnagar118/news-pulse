import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb';
import { config } from '../config';
import { Article, Cluster, IngestionJob } from '../types';

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB instance (supports local instance and MongoDB Atlas SRV URI).
 */
export const connectDb = async (): Promise<Db> => {
  if (db && client) {
    return db;
  }

  const clientOptions: MongoClientOptions = {
    serverSelectionTimeoutMS: 5000,
  };

  client = new MongoClient(config.mongodbUri, clientOptions);

  await client.connect();
  // If URI includes database name, getDatabase uses it, otherwise defaults to 'news_pulse'
  db = client.db();
  return db;
};

/**
 * Get active MongoDB database instance.
 */
export const getDb = (): Db => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb() first.');
  }
  return db;
};

/**
 * Get 'articles' collection accessor.
 */
export const getArticlesCollection = (): Collection<Article> => {
  return getDb().collection<Article>('articles');
};

/**
 * Get 'clusters' collection accessor.
 */
export const getClustersCollection = (): Collection<Cluster> => {
  return getDb().collection<Cluster>('clusters');
};

/**
 * Get 'ingestion_jobs' collection accessor.
 */
export const getIngestionJobsCollection = (): Collection<IngestionJob> => {
  return getDb().collection<IngestionJob>('ingestion_jobs');
};

/**
 * Ensure MongoDB indexes for performance and unique constraints:
 * - articles: unique url, source, publishedAt, clusterId
 * - clusters: startTime, endTime
 * - ingestion_jobs: unique jobId, status, startedAt
 */
export const ensureIndexes = async (): Promise<void> => {
  const database = await connectDb();

  try {
    // Articles indexes
    await database.collection('articles').createIndex({ url: 1 }, { unique: true, name: 'idx_articles_url_unique' });
    await database.collection('articles').createIndex({ source: 1 }, { name: 'idx_articles_source' });
    await database.collection('articles').createIndex({ publishedAt: -1 }, { name: 'idx_articles_published_at' });
    await database.collection('articles').createIndex({ clusterId: 1 }, { name: 'idx_articles_cluster_id' });
    await database.collection('articles').createIndex({ category: 1 }, { name: 'idx_articles_category' });

    // Clusters indexes
    await database.collection('clusters').createIndex({ startTime: -1 }, { name: 'idx_clusters_start_time' });
    await database.collection('clusters').createIndex({ endTime: -1 }, { name: 'idx_clusters_end_time' });

    // Ingestion jobs indexes
    await database.collection('ingestion_jobs').createIndex({ jobId: 1 }, { unique: true, name: 'idx_jobs_job_id_unique' });
    await database.collection('ingestion_jobs').createIndex({ status: 1 }, { name: 'idx_jobs_status' });
    await database.collection('ingestion_jobs').createIndex({ startedAt: -1 }, { name: 'idx_jobs_started_at' });
  } catch (err: any) {
    if (err.code !== 85) {
      throw err;
    }
  }
};

/**
 * Check database connection health for readiness probe.
 */
export const checkDbConnection = async (): Promise<boolean> => {
  try {
    const database = await connectDb();
    const ping = await database.command({ ping: 1 });
    return ping.ok === 1;
  } catch (error) {
    return false;
  }
};

/**
 * Disconnect client gracefully on shutdown.
 */
export const closeDb = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};
