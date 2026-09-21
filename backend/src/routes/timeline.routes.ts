import { Router } from 'express';
import { timelineController } from '../controllers/timeline.controller';

const router = Router();

// GET /timeline - Fetch paginated timeline items with filters
router.get('/', (req, res, next) => timelineController.getTimeline(req, res, next));

// GET /timeline/sources - Get distinct source list
router.get('/sources', (req, res, next) => timelineController.getSources(req, res, next));

export default router;
