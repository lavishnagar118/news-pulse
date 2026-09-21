import { Router } from 'express';
import { articleController } from '../controllers/article.controller';

const router = Router();

// Specific routes before parameterized :id
router.get('/search', (req, res, next) => articleController.searchArticles(req, res, next));
router.get('/', (req, res, next) => articleController.getArticles(req, res, next));
router.get('/:id', (req, res, next) => articleController.getArticleById(req, res, next));

export default router;
