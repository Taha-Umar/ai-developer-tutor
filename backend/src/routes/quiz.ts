import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';

const router: Router = Router();

// POST /api/quiz/sessions - Create a new quiz session
router.post('/sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { questions, answers, score, total_questions, completed, time_taken } = req.body;
  const session = await db.createQuizSession({
    user_id: userId,
    questions: questions || [],
    answers: answers || [],
    score: score || 0,
    total_questions: total_questions || 0,
    completed: completed || false,
    time_taken: time_taken || 0
  });
  res.json({ success: true, data: { session } });
}));

// PATCH /api/quiz/sessions/:sessionId - Update a quiz session
router.patch('/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const updates = req.body;
  const updated = await db.updateQuizSession(sessionId, updates);
  res.json({ success: true, data: { updated } });
}));

// GET /api/quiz/sessions - Get user's quiz sessions
router.get('/sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const sessions = await db.getUserQuizSessions(userId);
  res.json({ success: true, data: { sessions } });
}));

export default router; 