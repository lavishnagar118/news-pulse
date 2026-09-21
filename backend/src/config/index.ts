import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/news_pulse',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  scraperMode: (process.env.SCRAPER_MODE || 'subprocess') as 'subprocess' | 'http',
  scraperServiceUrl: process.env.SCRAPER_SERVICE_URL || '',
  ingestionServiceSecret: process.env.INGESTION_SERVICE_SECRET || '',
  pythonBin: process.env.PYTHON_BIN || 'python',
  pythonScraperPath: process.env.PYTHON_SCRAPER_PATH || '../scraper/main.py',
};
