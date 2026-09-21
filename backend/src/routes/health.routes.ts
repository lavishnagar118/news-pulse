import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../db';

const router = Router();

/**
 * GET /health
 * Returns service status and MongoDB connectivity.
 */
router.get('/', async (req: Request, res: Response) => {
  const dbConnected = await checkDbConnection();
  
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'healthy' : 'degraded',
    service: 'news-pulse-backend',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
