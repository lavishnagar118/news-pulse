import { Router } from 'express';
import { articleController } from '../controllers/article.controller';

const router = Router();

router.get('/', (req, res, next) => articleController.getCategories(req, res, next));

export default router;
