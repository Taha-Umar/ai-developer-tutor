import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ValidationError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';
import { langGraphManager } from '../langGraph/graphManager';

const router: Router = Router();

// POST /api/code/analyze - Analyze code and provide feedback, and store submission
router.post('/analyze', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { code, language = 'javascript', analysis_results, feedback_provided } = req.body;

  if (!code?.trim()) {
    throw new ValidationError('Code is required for analysis');
  }

  // Generate AI feedback using LangGraph
  let aiFeedback = '';
  try {
    aiFeedback = await langGraphManager.executeCodeFeedbackNode({
      current_node: 'code-feedback',
      user_id: userId,
      session_id: 'code-feedback-session',
      context: {
        user_preferences: {},
        user_input: code,
        last_code_snippet: code,
        conversation_history: [],
        available_transitions: [],
      },
      metadata: { timestamp: new Date().toISOString(), iteration_count: 0 }
    });
  } catch (err) {
    aiFeedback = 'AI feedback could not be generated.';
  }

  // Store code submission with AI feedback
  const submission = await db.createCodeSubmission({
    user_id: userId,
    code,
    language,
    analysis_results: analysis_results || {},
    feedback_provided: aiFeedback || feedback_provided || '',
  });

  res.json({
    success: true,
    data: {
      submission,
      feedback: aiFeedback,
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

// DELETE /api/code/:id - Delete a code submission by id
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const submissionId = req.params.id;
  // Fetch the submission to check ownership
  const submissions = await db.getUserCodeSubmissions(userId);
  const submission = submissions.find((s: any) => s.id === submissionId);
  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submission not found or not authorized.' });
  }
  const deleted = await db.deleteCodeSubmission(submissionId);
  if (!deleted) {
    return res.status(500).json({ success: false, message: 'Failed to delete submission.' });
  }
  res.json({ success: true });
}));

export default router; 