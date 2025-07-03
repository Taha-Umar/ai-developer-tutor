import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import configurations and middleware
import { config } from './config/environment';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import codeRoutes from './routes/code';
import learningRoutes from './routes/learning';
import progressRoutes from './routes/progress';
import testRoutes from './routes/test';
import quizRoutes from './routes/quiz';

// Import Socket.IO handler
import { initializeSocketHandlers } from './services/socketService';

// Import LangGraph
import { initializeLangGraph } from './langGraph/graphManager';

// Load environment variables
dotenv.config();

class AITutorServer {
  private app: express.Application;
  private server: HttpServer;
  private io: Server;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.frontendUrl,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    this.port = config.port;

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeSocketIO();
    this.initializeErrorHandling();
    this.initializeLangGraph(); // Database-independent with smart fallbacks
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: config.frontendUrl,
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api/', limiter);

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });
  }

  private initializeRoutes(): void {
    // Test routes (no authentication required)
    this.app.use('/api/test', testRoutes);
    
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/chat', authMiddleware, chatRoutes);
    this.app.use('/api/code', authMiddleware, codeRoutes);
    this.app.use('/api/learning', authMiddleware, learningRoutes);
    this.app.use('/api/progress', authMiddleware, progressRoutes);
    this.app.use('/api/quiz', quizRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'AI Developer Tutor API',
        version: '1.0.0',
        description: 'Backend API for AI-powered developer tutoring platform',
        endpoints: {
          test: '/api/test',
          auth: '/api/auth',
          chat: '/api/chat',
          code: '/api/code',
          learning: '/api/learning',
          progress: '/api/progress',
          quiz: '/api/quiz'
        },
        websocket: '/socket.io',
        health: '/health'
      });
    });

    // 404 handler for unknown routes  
    this.app.all('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The requested route ${req.originalUrl} does not exist.`,
        availableRoutes: ['/api', '/health']
      });
    });
  }

  private initializeSocketIO(): void {
    // Initialize Socket.IO event handlers
    initializeSocketHandlers(this.io);

    // Socket.IO connection logging
    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connected: ${socket.id}`);
      
      socket.on('disconnect', (reason) => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Graceful shutdown
      this.shutdown();
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      // Graceful shutdown
      this.shutdown();
    });

    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  private async initializeLangGraph(): Promise<void> {
    try {
      await initializeLangGraph();
      console.log('[LangGraph] Successfully initialized');
    } catch (error) {
      console.error('[LangGraph] Initialization failed:', error);
      throw error;
    }
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log('🚀 AI Developer Tutor Server Started Successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🌍 Server running on: http://localhost:${this.port}`);
      console.log(`📡 Socket.IO running on: ws://localhost:${this.port}`);
      console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
      console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
      console.log(`📚 Environment: ${config.nodeEnv}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 Features initialized:');
      console.log('  ✅ Express Server');
      console.log('  ✅ Socket.IO Real-time Communication');
      console.log('  ✅ LangGraph AI Orchestration');
      console.log('  ✅ OpenAI Integration');
      console.log('  ✅ Supabase Database');
      console.log('  ✅ JWT Authentication');
      console.log('  ✅ Rate Limiting & Security');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  }

  private shutdown(): void {
    console.log('Shutting down server...');
    
    this.server.close(() => {
      console.log('Server closed successfully');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }
}

// Start the server
const server = new AITutorServer();
server.start();

export default AITutorServer; 