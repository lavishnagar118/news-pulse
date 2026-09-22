import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

/**
 * Middleware protecting scheduled ingestion trigger endpoints.
 * Requires Authorization: Bearer <INGESTION_SERVICE_SECRET>
 * Uses timing-safe string comparison to prevent timing side-channel attacks.
 * Never logs the Authorization header or secret content.
 */
export const requireIngestionSecret = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const configuredSecret = (process.env.INGESTION_SERVICE_SECRET || config.ingestionServiceSecret || '').trim();

  // If the server does not have a secret configured, reject for defense-in-depth
  if (!configuredSecret) {
    return next(new UnauthorizedError('Ingestion secret authentication is not configured on this server.'));
  }

  let providedToken: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string') {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      providedToken = parts[1];
    }
  }

  // Also support X-Ingestion-Secret header if Authorization is not provided
  if (!providedToken && typeof req.headers['x-ingestion-secret'] === 'string') {
    providedToken = req.headers['x-ingestion-secret'].trim();
  }

  if (!providedToken) {
    return next(new UnauthorizedError('Missing authentication credentials.'));
  }

  const providedBuffer = Buffer.from(providedToken, 'utf-8');
  const expectedBuffer = Buffer.from(configuredSecret, 'utf-8');

  // Both buffers must have identical lengths for crypto.timingSafeEqual.
  // Execute a dummy comparison on identical buffers if lengths differ to normalize execution time.
  if (providedBuffer.length !== expectedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return next(new UnauthorizedError('Invalid authentication credentials.'));
  }

  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  if (!isValid) {
    return next(new UnauthorizedError('Invalid authentication credentials.'));
  }

  next();
};
