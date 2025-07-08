import { Router, Request, Response } from 'express';

const router: Router = Router();

// Test endpoint - no database required
router.get('/ping', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint with params
router.get('/echo/:message', (req: Request, res: Response) => {
  const { message } = req.params;
  res.json({
    success: true,
    echo: message,
    timestamp: new Date().toISOString()
  });
});

// Test POST endpoint
router.post('/test-post', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'POST request received successfully',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test LangGraph AI orchestration without authentication
router.post('/ai-chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    const userId = 'test_user_123';
    const sessionId = 'test_session_' + Date.now();
    
    // Import LangGraph manager
    const { langGraphManager } = require('../langGraph/graphManager');
    
    // Execute the graph, passing context if present
    const result = await langGraphManager.executeGraph(
      userId,
      sessionId, 
      message || 'Hello, I need help with programming',
      context || {}
    );
    
    res.json({
      success: true,
      ai_response: result.response,
      current_node: result.current_node,
      available_transitions: result.available_transitions,
      session_context: result.session_context,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 