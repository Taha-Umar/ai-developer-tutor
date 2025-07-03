"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const graphManager_1 = require("../langGraph/graphManager");
const router = (0, express_1.Router)();
// POST /api/chat/message - Send message to AI tutor
router.post('/message', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { message, sessionId, nodeType } = req.body;
    const userId = req.user.id;
    if (!message?.trim()) {
        throw new errorHandler_1.ValidationError('Message is required');
    }
    let currentSessionId = sessionId;
    // Create new session if none provided
    if (!currentSessionId) {
        const newSession = await database_1.db.createChatSession({
            user_id: userId,
            session_name: `Chat Session ${new Date().toLocaleDateString()}`,
            current_node: 'router',
            conversation_history: [],
            context: {},
            available_transitions: []
        });
        if (!newSession) {
            throw new Error('Failed to create chat session');
        }
        currentSessionId = newSession.id;
    }
    // Get existing session context
    const session = await database_1.db.getChatSession(currentSessionId);
    const sessionContext = session?.context || {};
    try {
        // Execute LangGraph with user message
        const result = await graphManager_1.langGraphManager.executeGraph(userId, currentSessionId, message.trim(), sessionContext);
        res.json({
            success: true,
            data: {
                response: result.response,
                sessionId: currentSessionId,
                currentNode: result.current_node,
                availableTransitions: result.available_transitions,
                metadata: result.metadata
            }
        });
    }
    catch (error) {
        console.error('LangGraph execution error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process your message. Please try again.',
            sessionId: currentSessionId
        });
    }
}));
// GET /api/chat/sessions - Get user's chat sessions
router.get('/sessions', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const sessions = await database_1.db.getUserChatSessions(userId);
    res.json({
        success: true,
        data: {
            sessions: sessions.map(session => ({
                id: session.id,
                name: session.session_name,
                currentNode: session.current_node,
                lastActivity: session.last_activity,
                createdAt: session.created_at,
                messageCount: session.conversation_history?.length || 0
            }))
        }
    });
}));
// GET /api/chat/sessions/:sessionId - Get specific chat session
router.get('/sessions/:sessionId', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const session = await database_1.db.getChatSession(sessionId);
    if (!session) {
        throw new errorHandler_1.ValidationError('Chat session not found');
    }
    if (session.user_id !== userId) {
        throw new errorHandler_1.ValidationError('Access denied to this chat session');
    }
    res.json({
        success: true,
        data: {
            session: {
                id: session.id,
                name: session.session_name,
                currentNode: session.current_node,
                conversationHistory: session.conversation_history,
                availableTransitions: session.available_transitions,
                context: session.context,
                createdAt: session.created_at,
                lastActivity: session.last_activity
            }
        }
    });
}));
// POST /api/chat/sessions/:sessionId/rename - Rename chat session
router.post('/sessions/:sessionId/rename', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;
    if (!name?.trim()) {
        throw new errorHandler_1.ValidationError('Session name is required');
    }
    const session = await database_1.db.getChatSession(sessionId);
    if (!session) {
        throw new errorHandler_1.ValidationError('Chat session not found');
    }
    if (session.user_id !== userId) {
        throw new errorHandler_1.ValidationError('Access denied to this chat session');
    }
    const updatedSession = await database_1.db.updateChatSession(sessionId, {
        session_name: name.trim()
    });
    res.json({
        success: true,
        message: 'Session renamed successfully',
        data: {
            session: {
                id: updatedSession.id,
                name: updatedSession.session_name
            }
        }
    });
}));
// POST /api/chat/switch-node - Switch to a different AI node
router.post('/switch-node', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { sessionId, nodeType, message } = req.body;
    const userId = req.user.id;
    if (!sessionId) {
        throw new errorHandler_1.ValidationError('Session ID is required');
    }
    if (!nodeType) {
        throw new errorHandler_1.ValidationError('Node type is required');
    }
    const session = await database_1.db.getChatSession(sessionId);
    if (!session) {
        throw new errorHandler_1.ValidationError('Chat session not found');
    }
    if (session.user_id !== userId) {
        throw new errorHandler_1.ValidationError('Access denied to this chat session');
    }
    // Validate node type
    const availableNodes = graphManager_1.langGraphManager.getAvailableNodes();
    if (!availableNodes.includes(nodeType)) {
        throw new errorHandler_1.ValidationError(`Invalid node type. Available: ${availableNodes.join(', ')}`);
    }
    try {
        // Execute with node switch
        const switchMessage = message || `Switch to ${nodeType} mode`;
        const result = await graphManager_1.langGraphManager.executeGraph(userId, sessionId, switchMessage, { ...session.context, requested_node: nodeType });
        res.json({
            success: true,
            message: `Switched to ${nodeType} mode`,
            data: {
                response: result.response,
                currentNode: result.current_node,
                availableTransitions: result.available_transitions
            }
        });
    }
    catch (error) {
        console.error('Node switch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to switch nodes. Please try again.'
        });
    }
}));
// GET /api/chat/available-nodes - Get available AI nodes
router.get('/available-nodes', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const nodes = graphManager_1.langGraphManager.getAvailableNodes();
    const nodeInfo = nodes.map(nodeType => ({
        type: nodeType,
        name: nodeType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        description: getNodeDescription(nodeType)
    }));
    res.json({
        success: true,
        data: {
            nodes: nodeInfo
        }
    });
}));
// Helper function to get node descriptions
function getNodeDescription(nodeType) {
    const descriptions = {
        'code-feedback': 'Get AI-powered feedback and analysis on your code',
        'concept-explainer': 'Learn programming concepts with personalized explanations',
        'quiz-generator': 'Take interactive quizzes to test your knowledge',
        'mistake-analyzer': 'Analyze your learning progress and identify improvement areas'
    };
    return descriptions[nodeType] || 'AI tutoring node';
}
// POST /api/chat/feedback - Provide feedback on AI response
router.post('/feedback', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { sessionId, messageId, rating, feedback } = req.body;
    const userId = req.user.id;
    // This would typically save feedback to improve the AI
    // For now, just acknowledge the feedback
    res.json({
        success: true,
        message: 'Thank you for your feedback! It helps us improve the AI tutor.'
    });
}));
exports.default = router;
