import { Request, Response, NextFunction } from 'express';
import { articleService } from '../services/article.service';

export class ArticleController {
  /**
   * GET /articles
   * Paginated list of article summaries.
   */
  async getArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const category = req.query.category as string | undefined;
      const source = req.query.source as string | undefined;
      const sort = req.query.sort === 'asc' ? 'asc' : 'desc';

      const result = await articleService.getArticles({
        limit,
        offset,
        category,
        source,
        sort,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /articles/search?q=...
   * Search articles across title, summary, source, and category.
   */
  async searchArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const category = req.query.category as string | undefined;
      const source = req.query.source as string | undefined;

      const result = await articleService.searchArticles(q, {
        category,
        source,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /articles/:id
   * Full article reading view with body content and related stories.
   */
  async getArticleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const article = await articleService.getArticleById(id);
      res.status(200).json(article);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /categories
   * List distinct categories and their article counts.
   */
  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await articleService.getCategories();
      res.status(200).json(categories);
    } catch (err) {
      next(err);
    }
  }
}

export const articleController = new ArticleController();
