import { Request, Response, NextFunction } from 'express';
import { clusterService } from '../services/cluster.service';
import { ClusterSummaryDto, ClusterDetailDto } from '../types';

export class ClusterController {
  /**
   * GET /clusters
   * Returns list of topic clusters sorted by startTime descending.
   */
  async getClusters(
    req: Request,
    res: Response<ClusterSummaryDto[]>,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

      const clusters = await clusterService.getAllClusters(limit, offset);
      res.status(200).json(clusters);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clusters/:id
   * Returns detailed cluster view including grouped member articles.
   */
  async getClusterById(
    req: Request,
    res: Response<ClusterDetailDto>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const cluster = await clusterService.getClusterById(id);
      res.status(200).json(cluster);
    } catch (error) {
      next(error);
    }
  }
}

export const clusterController = new ClusterController();
