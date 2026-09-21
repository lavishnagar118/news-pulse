import { Router } from 'express';
import clusterRoutes from './cluster.routes';
import timelineRoutes from './timeline.routes';
import ingestRoutes from './ingest.routes';
import healthRoutes from './health.routes';
import articleRoutes from './article.routes';
import categoryRoutes from './category.routes';

const router = Router();

// Exact required public routes
router.use('/clusters', clusterRoutes);
router.use('/timeline', timelineRoutes);
router.use('/ingest', ingestRoutes);
router.use('/health', healthRoutes);

// Product enhancement routes for news discovery, reader, and categories
router.use('/articles', articleRoutes);
router.use('/categories', categoryRoutes);

export default router;
