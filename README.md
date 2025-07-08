# AI Developer Tutor 

A powerful Node.js backend for the AI Developer Tutor platform, featuring LangGraph orchestration, real-time chat, and personalized learning experiences.

## 🚀 Features

- **🧠 LangGraph AI Orchestration** - Intelligent routing between specialized tutoring nodes
- **💬 Real-time Chat** - Socket.IO powered conversations with AI tutor
- **🔐 JWT Authentication** - Secure user sessions and data protection
- **📊 Supabase Integration** - Scalable database for user data and sessions
- **🎯 4 AI Tutoring Modes:**
  - **Code Feedback** - Analyze and improve code quality
  - **Concept Explainer** - Learn programming concepts
  - **Quiz Generator** - Interactive knowledge testing
  - **Mistake Analyzer** - Track learning progress

## 🛠️ Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Real-time:** Socket.IO
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-4 + LangGraph
- **Auth:** JWT with bcrypt
- **Security:** Helmet, CORS, Rate Limiting

## ⚡ Quick Start

### 1. Environment Setup

Create a `.env` file:

```bash
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build & Run

```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Chat & AI Tutoring
- `POST /api/chat/message` - Send message to AI tutor
- `GET /api/chat/sessions` - Get user's chat sessions
- `POST /api/chat/switch-node` - Switch AI tutoring mode
- `GET /api/chat/available-nodes` - Get available AI nodes

### Code Analysis
- `POST /api/code/analyze` - Analyze code with AI feedback

### Learning & Progress
- `GET /api/learning/paths` - Get learning paths
- `GET /api/progress/overview` - Get progress overview

## 🔌 Socket.IO Events

### Client → Server
- `chat:join` - Join a chat session
- `chat:message` - Send message to AI tutor
- `chat:switch_node` - Switch tutoring mode
- `chat:typing` - Send typing indicator

### Server → Client
- `connection:success` - Connection established
- `chat:response` - AI tutor response
- `chat:ai_thinking` - AI processing indicator
- `chat:node_switched` - Tutoring mode changed
- `chat:available_nodes` - Available AI nodes

## 🧠 LangGraph Architecture

The AI tutoring system uses LangGraph to orchestrate between specialized nodes:

```
User Input → Router → [Node Selection] → AI Response
                            ↓
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Code Feedback  │ Concept Explain │ Quiz Generator  │ Mistake Analyzer│
│                 │                 │                 │                 │
│ • Code Review   │ • Explanations  │ • MCQ Questions │ • Progress Track│
│ • Bug Detection │ • Examples      │ • Code Puzzles  │ • Weak Areas   │
│ • Best Practices│ • Tutorials     │ • Instant Quiz  │ • Study Plans  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## 📊 Database Schema

The system uses Supabase with the following key tables:

- **users** - User accounts and preferences
- **chat_sessions** - Conversation sessions
- **concept_mastery** - Learning progress tracking
- **learning_paths** - Personalized curricula
- **quiz_sessions** - Quiz attempts and scores

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** to prevent abuse
- **Input Validation** on all endpoints
- **CORS Protection** for cross-origin requests
- **Helmet.js** for security headers
- **bcrypt** password hashing

## 🚀 Deployment

The backend is designed to be deployed on:

- **Railway** or **Render** for the Node.js app
- **Supabase** for the database
- **OpenAI** for AI capabilities

## 🧪 Testing

```bash
# Test server health
curl http://localhost:5000/health

# Test API documentation
curl http://localhost:5000/api
```

## 📖 Development

### Project Structure
```
src/
├── config/          # Environment & database config
├── controllers/     # Business logic (future)
├── middleware/      # Auth, error handling, validation
├── models/          # Data models (future)
├── routes/          # API route definitions
├── services/        # External service integrations
├── langGraph/       # AI orchestration system
├── utils/           # Helper functions (future)
└── index.ts         # Main application entry point
```

### Key Files
- `src/index.ts` - Main server setup
- `src/langGraph/graphManager.ts` - AI orchestration
- `src/services/socketService.ts` - Real-time chat
- `src/middleware/auth.ts` - Authentication
- `src/config/database.ts` - Database operations

## 🎯 Next Steps

To integrate with OpenAI and Supabase:

1. **Get OpenAI API Key** from https://platform.openai.com/
2. **Create Supabase Project** at https://supabase.com/
3. **Set up Database Tables** using the schema
4. **Update Environment Variables**
5. **Deploy to Production**

## 🤝 Contributing

The backend is designed to be:
- **Modular** - Easy to add new AI nodes
- **Scalable** - Ready for production deployment
- **Extensible** - Support for future features

---

**Built with ❤️ for AI-powered developer education**
