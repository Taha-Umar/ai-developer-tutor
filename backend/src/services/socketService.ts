const SocketIO = require('socket.io');
const jwt = require('jsonwebtoken');
import { config } from '../config/environment';
import { db } from '../config/database';
import { langGraphManager } from '../langGraph/graphManager';

interface AuthenticatedSocket {
  user?: {
    id: string;
    username: string;
    email: string;
  };
  handshake: any;
  id: string;
  join: (room: string) => void;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  to: (room: string) => any;
}

interface ChatMessage {
  message: string;
  sessionId?: string;
  nodeType?: string;
}

interface JoinRoomData {
  sessionId: string;
}

export const initializeSocketHandlers = (io: any): void => {
  // Authentication middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      
      // Get user from database
      const user = await db.getUserById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = {
        id: user.id,
        username: user.username,
        email: user.email
      };

      // Update user's last active
      await db.updateUserLastActive(user.id);

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Handle client connections
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.IO] User connected: ${socket.user?.username} (${socket.id})`);

    // Join user to their personal room
    socket.join(`user:${socket.user!.id}`);

    // Send welcome message
    socket.emit('connection:success', {
      message: 'Connected to AI Developer Tutor',
      userId: socket.user!.id,
      username: socket.user!.username
    });

    // Handle joining chat sessions
    socket.on('chat:join', async (data: JoinRoomData) => {
      try {
        const { sessionId } = data;
        
        // Verify session belongs to user
        const session = await db.getChatSession(sessionId);
        if (session && session.user_id === socket.user!.id) {
          socket.join(`session:${sessionId}`);
          socket.emit('chat:joined', { sessionId });
          console.log(`[Socket.IO] User ${socket.user!.username} joined session ${sessionId}`);
        } else {
          socket.emit('error', { message: 'Access denied to chat session' });
        }
      } catch (error) {
        console.error('Error joining chat session:', error);
        socket.emit('error', { message: 'Failed to join chat session' });
      }
    });

    // Handle chat messages
    socket.on('chat:message', async (data: ChatMessage) => {
      try {
        const { message, sessionId, nodeType } = data;
        const userId = socket.user!.id;

        if (!message?.trim()) {
          socket.emit('error', { message: 'Message cannot be empty' });
          return;
        }

        // Show typing indicator to user
        socket.emit('chat:ai_thinking', { thinking: true });

        let currentSessionId = sessionId;

        // Create new session if none provided
        if (!currentSessionId) {
          const newSession = await db.createChatSession({
            user_id: userId,
            session_name: `Chat Session ${new Date().toLocaleDateString()}`,
            current_node: 'router',
            conversation_history: [],
            context: {},
            available_transitions: []
          });

          if (!newSession) {
            socket.emit('error', { message: 'Failed to create chat session' });
            return;
          }

          currentSessionId = newSession.id;
          socket.join(`session:${currentSessionId}`);
        }

        // Get session context
        const session = await db.getChatSession(currentSessionId);
        const sessionContext = session?.context || {};

        // Execute LangGraph
        const result = await langGraphManager.executeGraph(
          userId,
          currentSessionId,
          message.trim(),
          sessionContext
        );

        // Stop thinking indicator
        socket.emit('chat:ai_thinking', { thinking: false });

        // Send response
        const response = {
          response: result.response,
          sessionId: currentSessionId,
          currentNode: result.current_node,
          availableTransitions: result.available_transitions,
          timestamp: new Date().toISOString(),
          metadata: result.metadata
        };

        socket.emit('chat:response', response);

        // Also send to session room (for potential future multi-user features)
        socket.to(`session:${currentSessionId}`).emit('chat:message_received', {
          userId,
          username: socket.user!.username,
          message: message.trim(),
          timestamp: new Date().toISOString()
        });

        console.log(`[Socket.IO] Message processed for user ${socket.user!.username} in session ${currentSessionId}`);

      } catch (error) {
        console.error('Error processing chat message:', error);
        socket.emit('chat:ai_thinking', { thinking: false });
        socket.emit('error', { 
          message: 'Failed to process your message. Please try again.',
          sessionId: data.sessionId
        });
      }
    });

    // Handle node switching
    socket.on('chat:switch_node', async (data: { sessionId: string; nodeType: string; message?: string }) => {
      try {
        const { sessionId, nodeType, message } = data;
        const userId = socket.user!.id;

        // Verify session access
        const session = await db.getChatSession(sessionId);
        if (!session || session.user_id !== userId) {
          socket.emit('error', { message: 'Access denied to chat session' });
          return;
        }

        // Validate node type
        const availableNodes = langGraphManager.getAvailableNodes();
        if (!availableNodes.includes(nodeType as any)) {
          socket.emit('error', { 
            message: `Invalid node type. Available: ${availableNodes.join(', ')}` 
          });
          return;
        }

        socket.emit('chat:ai_thinking', { thinking: true });

        // Execute node switch
        const switchMessage = message || `Switch to ${nodeType} mode`;
        const result = await langGraphManager.executeGraph(
          userId,
          sessionId,
          switchMessage,
          { ...session.context, requested_node: nodeType }
        );

        socket.emit('chat:ai_thinking', { thinking: false });

        socket.emit('chat:node_switched', {
          sessionId,
          currentNode: result.current_node,
          response: result.response,
          availableTransitions: result.available_transitions,
          message: `Switched to ${nodeType} mode`
        });

      } catch (error) {
        console.error('Error switching node:', error);
        socket.emit('chat:ai_thinking', { thinking: false });
        socket.emit('error', { message: 'Failed to switch nodes' });
      }
    });

    // Handle typing indicators
    socket.on('chat:typing', (data: { sessionId: string; typing: boolean }) => {
      const { sessionId, typing } = data;
      socket.to(`session:${sessionId}`).emit('chat:user_typing', {
        userId: socket.user!.id,
        username: socket.user!.username,
        typing
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] User disconnected: ${socket.user?.username} (${socket.id}), reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for user ${socket.user?.username}:`, error);
    });

    // Send available nodes on connection
    socket.emit('chat:available_nodes', {
      nodes: langGraphManager.getAvailableNodes().map(nodeType => ({
        type: nodeType,
        name: nodeType.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: getNodeDescription(nodeType)
      }))
    });
  });

  // Helper function for node descriptions
  function getNodeDescription(nodeType: string): string {
    const descriptions = {
      'code-feedback': 'Get AI-powered feedback and analysis on your code',
      'concept-explainer': 'Learn programming concepts with personalized explanations',
      'quiz-generator': 'Take interactive quizzes to test your knowledge',
      'mistake-analyzer': 'Analyze your learning progress and identify improvement areas'
    };
    
    return descriptions[nodeType as keyof typeof descriptions] || 'AI tutoring node';
  }

  console.log('✅ Socket.IO handlers initialized');
};

export default initializeSocketHandlers; 