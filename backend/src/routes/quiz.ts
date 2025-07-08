import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { db } from '../config/database';
import langGraphManager from '../langGraph/graphManager';

const router: Router = Router();

// POST /api/quiz/sessions - Create a new quiz session
router.post('/sessions', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }
  const userId = req.user.id;
  const { questions, answers, score, total_questions, completed, time_taken, topic, difficulty } = req.body;

  // Use AI to generate quiz questions based on topic and difficulty if provided
  let aiQuestions = [];
  if (topic) {
    aiQuestions = await langGraphManager.generateQuizQuestions({
      topic,
      total_questions: total_questions || 5,
      userId,
      difficulty
    });
  } else if (questions && questions.length > 0 && questions[0].question) {
    aiQuestions = await langGraphManager.generateQuizQuestions({
      topic: questions[0].question,
      total_questions: total_questions || 5,
      userId
    });
  }

  const session = await db.createQuizSession({
    user_id: userId,
    questions: aiQuestions,
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
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }
  const userId = req.user.id;
  const sessions = await db.getUserQuizSessions(userId);
  res.json({ success: true, data: { sessions } });
}));

// DELETE /api/quiz/sessions/:sessionId - Delete a quiz session
router.delete('/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }
  const userId = req.user.id;
  const { sessionId } = req.params;
  // Fetch the session to check ownership
  const sessions = await db.getUserQuizSessions(userId);
  const session = sessions.find((s: any) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Quiz session not found or not owned by user" });
  }
  const deleted = await db.deleteQuizSession(sessionId);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: "Failed to delete quiz session" });
  }
}));

// POST /api/quiz/sessions/:sessionId/submit - Submit answers for a quiz session
router.post('/sessions/:sessionId/submit', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }
  const userId = req.user.id;
  const { sessionId } = req.params;
  const { answers } = req.body; // [{ question_id, user_answer, time_taken }]

  // Fetch the quiz session and questions
  const sessions = await db.getUserQuizSessions(userId);
  const session = sessions.find((s: any) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Quiz session not found or not owned by user" });
  }
  const questions = session.questions || [];
  let score = 0;
  const detailedAnswers = answers.map((ans: any) => {
    const q = questions.find((qq: any) => qq.id === ans.question_id);
    const is_correct = q && ans.user_answer === q.correct_answer;
    if (is_correct) score++;
    return {
      question_id: ans.question_id,
      user_answer: ans.user_answer,
      is_correct,
      time_taken: ans.time_taken || 0,
      timestamp: new Date().toISOString(),
    };
  });
  // Save answers and score
  await db.updateQuizSession(sessionId, {
    answers: detailedAnswers,
    score,
    completed: true,
    completed_at: new Date().toISOString(),
  });
  // Prepare explanations for incorrect answers
  const wrongExplanations = detailedAnswers
    .filter((a: any) => !a.is_correct)
    .map((a: any) => {
      const q = questions.find((qq: any) => qq.id === a.question_id);
      return {
        question: q?.question,
        correct_answer: q?.correct_answer,
        explanation: q?.explanation,
      };
    });
  res.json({
    success: true,
    data: {
      score,
      total_questions: questions.length,
      wrong_explanations: wrongExplanations,
    }
  });
}));

// GET /api/quiz/sessions/:sessionId - Get a specific quiz session by ID
router.get('/sessions/:sessionId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }
  const userId = req.user.id;
  const { sessionId } = req.params;
  const sessions = await db.getUserQuizSessions(userId);
  const session = sessions.find((s: any) => s.id === sessionId);
  if (!session) {
    return res.status(404).json({ error: "Quiz session not found or not owned by user" });
  }
  res.json({ success: true, data: { session } });
}));

export default router; 