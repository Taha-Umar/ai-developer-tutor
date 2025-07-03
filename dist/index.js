"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv_1 = __importDefault(require("dotenv"));
// Import configurations and middleware
const environment_1 = require("./config/environment");
const auth_1 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
// Import routes
const auth_2 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const code_1 = __importDefault(require("./routes/code"));
const learning_1 = __importDefault(require("./routes/learning"));
const progress_1 = __importDefault(require("./routes/progress"));
const test_1 = __importDefault(require("./routes/test"));
// Import Socket.IO handler
const socketService_1 = require("./services/socketService");
// Import LangGraph
const graphManager_1 = require("./langGraph/graphManager");
// Load environment variables
dotenv_1.default.config();
class AITutorServer {
    constructor() {
        this.app = (0, express_1.default)();
        this.server = (0, http_1.createServer)(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: environment_1.config.frontendUrl,
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.port = environment_1.config.port;
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeSocketIO();
        this.initializeErrorHandling();
        this.initializeLangGraph();
    }
    initializeMiddleware() {
        // Security middleware
        this.app.use(helmet());
        // CORS configuration
        this.app.use(cors({
            origin: environment_1.config.frontendUrl,
            credentials: true,
            optionsSuccessStatus: 200
        }));
        // Rate limiting
        const limiter = rateLimit({
            windowMs: environment_1.config.rateLimitWindowMs,
            max: environment_1.config.rateLimitMaxRequests,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(environment_1.config.rateLimitWindowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);
        // Logging
        this.app.use(morgan('combined'));
        // Body parsing
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
    initializeRoutes() {
        // Test routes (no authentication required)
        this.app.use('/api/test', test_1.default);
        // API routes
        this.app.use('/api/auth', auth_2.default);
        this.app.use('/api/chat', auth_1.authMiddleware, chat_1.default);
        this.app.use('/api/code', auth_1.authMiddleware, code_1.default);
        this.app.use('/api/learning', auth_1.authMiddleware, learning_1.default);
        this.app.use('/api/progress', auth_1.authMiddleware, progress_1.default);
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
                    progress: '/api/progress'
                },
                websocket: '/socket.io',
                health: '/health'
            });
        });
        // 404 handler for unknown routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Route not found',
                message: `The requested route ${req.originalUrl} does not exist.`,
                availableRoutes: ['/api', '/health']
            });
        });
    }
    initializeSocketIO() {
        // Initialize Socket.IO event handlers
        (0, socketService_1.initializeSocketHandlers)(this.io);
        // Socket.IO connection logging
        this.io.on('connection', (socket) => {
            console.log(`[Socket.IO] Client connected: ${socket.id}`);
            socket.on('disconnect', (reason) => {
                console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
            });
        });
    }
    initializeErrorHandling() {
        // Global error handler
        this.app.use(errorHandler_1.errorHandler);
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
    async initializeLangGraph() {
        try {
            await (0, graphManager_1.initializeLangGraph)();
            console.log('[LangGraph] Successfully initialized');
        }
        catch (error) {
            console.error('[LangGraph] Initialization failed:', error);
            throw error;
        }
    }
    start() {
        this.server.listen(this.port, () => {
            console.log('🚀 AI Developer Tutor Server Started Successfully!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🌍 Server running on: http://localhost:${this.port}`);
            console.log(`📡 Socket.IO running on: ws://localhost:${this.port}`);
            console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
            console.log(`🏥 Health Check: http://localhost:${this.port}/health`);
            console.log(`🌐 Frontend URL: ${environment_1.config.frontendUrl}`);
            console.log(`📚 Environment: ${environment_1.config.nodeEnv}`);
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
    shutdown() {
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
exports.default = AITutorServer;
