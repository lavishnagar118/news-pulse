import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { connectDb, ensureIndexes } from './db';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

export const createApp = (): Express => {
  const app = express();

  // Flexible CORS configuration supporting single origin or comma-separated origins
  const allowedOrigins = config.corsOrigin.includes(',')
    ? config.corsOrigin.split(',').map((o) => o.trim())
    : config.corsOrigin;

  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // Exact public API routes mounted directly at root
  // (GET /clusters, GET /clusters/:id, GET /timeline, POST /ingest/trigger, GET /ingest/status/:jobId, GET /health)
  app.use('/', routes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
};

// Start server if this file is executed directly
if (require.main === module) {
  const app = createApp();

  const startServer = async () => {
    try {
      // Connect to MongoDB and ensure indexes are created
      await connectDb();
      await ensureIndexes();
      console.log(`[News Pulse Backend] Connected to MongoDB and ensured indexes`);

      app.listen(config.port, '0.0.0.0', () => {
        console.log(`[News Pulse Backend] Server running in ${config.nodeEnv} mode on 0.0.0.0:${config.port}`);
      });
    } catch (err) {
      console.error('[News Pulse Backend] Failed to start server:', err);
      process.exit(1);
    }
  };

  startServer();
}
