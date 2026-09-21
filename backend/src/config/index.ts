import dotenv from 'dotenv';
import path from 'path';
import { ConfigurationError } from '../utils/errors';

// Load environment variables from .env file for local development/testing
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

export function resolveMongoUri(): string {
  const isTest =
    process.env.NODE_ENV === 'test' ||
    process.argv.some((a) => a.includes('test'));

  if (isTest) {
    return (
      process.env.TEST_MONGODB_URI ||
      'mongodb://127.0.0.1:27017/news_pulse_test'
    );
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI;

  if (isProduction) {
    if (!uri || !uri.trim()) {
      throw new ConfigurationError('MONGODB_URI is required in production');
    }
    return uri.trim();
  }

  // Explicit local development fallback
  return uri?.trim() || 'mongodb://127.0.0.1:27017/news_pulse';
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  get mongodbUri(): string {
    return resolveMongoUri();
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  scraperMode: (process.env.SCRAPER_MODE || 'subprocess') as 'subprocess' | 'http',
  scraperServiceUrl: process.env.SCRAPER_SERVICE_URL || '',
  ingestionServiceSecret: process.env.INGESTION_SERVICE_SECRET || '',
  pythonBin: process.env.PYTHON_BIN || 'python',
  pythonScraperPath: process.env.PYTHON_SCRAPER_PATH || '../scraper/main.py',
};

