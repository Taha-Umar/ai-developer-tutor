import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';

const router: Router = Router();

// GET /api/learning/paths - Get learning paths
router.get('/paths', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const paths = await db.getUserLearningPaths(userId);
  res.json({
    success: true,
    data: {
      paths
    }
  });
}));

// POST /api/learning/paths - Create a new learning path
router.post('/paths', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { topic, curriculum, progress_percentage, recommended_next } = req.body;
  const path = await db.createLearningPath({
    user_id: userId,
    topic,
    curriculum: curriculum || [],
    progress_percentage: progress_percentage || 0,
    recommended_next: recommended_next || []
  });
  res.json({ success: true, data: { path } });
}));

// PATCH /api/learning/paths/:pathId - Update a learning path
router.patch('/paths/:pathId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { pathId } = req.params;
  const updates = req.body;
  const updated = await db.updateLearningPath(pathId, updates);
  res.json({ success: true, data: { updated } });
}));

export default router; 