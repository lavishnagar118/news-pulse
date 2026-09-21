import { Router } from 'express';
import { clusterController } from '../controllers/cluster.controller';

const router = Router();

// GET /clusters - List active topic clusters
router.get('/', (req, res, next) => clusterController.getClusters(req, res, next));

// GET /clusters/:id - Get cluster details and member articles
router.get('/:id', (req, res, next) => clusterController.getClusterById(req, res, next));

export default router;
