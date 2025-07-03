import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';

const router: Router = Router();

// POST /api/code/analyze - Analyze code and provide feedback, and store submission
router.post('/analyze', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { code, language = 'javascript', analysis_results, feedback_provided } = req.body;

  if (!code?.trim()) {
    throw new ValidationError('Code is required for analysis');
  }

  // Store code submission
  const submission = await db.createCodeSubmission({
    user_id: userId,
    code,
    language,
    analysis_results: analysis_results || {},
    feedback_provided: feedback_provided || '',
  });

  // For now, return a simple response
  res.json({
    success: true,
    data: {
      submission,
      analysis: 'Code analysis feature will be integrated with LangGraph',
      language,
      suggestions: []
    }
  });
}));

// GET /api/code/submissions - Get user's code submissions
router.get('/submissions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const submissions = await db.getUserCodeSubmissions(userId);
  res.json({ success: true, data: { submissions } });
}));

export default router; 