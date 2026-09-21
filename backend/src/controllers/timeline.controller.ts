import { Request, Response, NextFunction } from 'express';
import { articleService } from '../services/article.service';
import { TimelineResponseDto } from '../types';

export class TimelineController {
  /**
   * GET /timeline
   * Returns chronological timeline clusters with density metrics (intensity) and sources.
   */
  async getTimeline(
    req: Request,
    res: Response<TimelineResponseDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      // Support source parameter as single string or comma-separated / array
      let sources: string[] | undefined;
      if (typeof req.query.source === 'string') {
        sources = req.query.source.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(req.query.source)) {
        sources = (req.query.source as string[]).map((s) => s.trim()).filter(Boolean);
      }

      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const sort = req.query.sort === 'desc' ? 'desc' : 'asc';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const timeline = await articleService.getTimeline({
        sources,
        startDate,
        endDate,
        sort,
        limit,
      });

      res.status(200).json(timeline);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /timeline/sources
   * Returns list of available news sources for filtering.
   */
  async getSources(
    req: Request,
    res: Response<{ sources: string[] }>,
    next: NextFunction
  ): Promise<void> {
    try {
      const sources = await articleService.getSources();
      res.status(200).json({ sources });
    } catch (error) {
      next(error);
    }
  }
}

export const timelineController = new TimelineController();
