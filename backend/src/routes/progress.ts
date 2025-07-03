import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';

const router: Router = Router();

// GET /api/progress/overview - Get user progress overview
router.get('/overview', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const mastery = await db.getUserConceptMastery(userId);
  const conceptsLearned = mastery.filter(m => m.mastery_level >= 80).length;
  const timeSpent = mastery.reduce((sum, m) => sum + (m.attempts * 5), 0); // Example: 5 min per attempt
  const streak = 0; // TODO: Implement streak logic

  res.json({
    success: true,
    data: {
      progress: {
        concepts_learned: conceptsLearned,
        time_spent: timeSpent,
        streak,
        mastery
      }
    }
  });
}));

// POST /api/progress/mastery - Upsert concept mastery for a user
router.post('/mastery', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { concept_id, concept_name, mastery_level, attempts, dependencies, related_concepts } = req.body;
  const record = await db.upsertConceptMastery({
    user_id: userId,
    concept_id,
    concept_name,
    mastery_level,
    attempts,
    dependencies: dependencies || [],
    related_concepts: related_concepts || [],
    last_practiced: new Date().toISOString()
  });
  res.json({ success: true, data: { record } });
}));

export default router; 