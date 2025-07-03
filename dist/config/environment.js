"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
class EnvironmentConfig {
    static getInstance() {
        if (!EnvironmentConfig.instance) {
            EnvironmentConfig.instance = EnvironmentConfig.createConfig();
        }
        return EnvironmentConfig.instance;
    }
    static createConfig() {
        // Check for missing environment variables but don't exit (for testing)
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_KEY',
            'OPENAI_API_KEY',
            'JWT_SECRET'
        ];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            console.warn('⚠️  Missing environment variables (using fallback values for testing):', missingEnvVars);
            console.warn('📝 For production, create a .env file based on env.example');
        }
        // Helper function to parse boolean from env
        const parseBoolean = (value, defaultValue) => {
            if (!value)
                return defaultValue;
            return value.toLowerCase() === 'true';
        };
        // Helper function to parse number from env
        const parseNumber = (value, defaultValue) => {
            if (!value)
                return defaultValue;
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? defaultValue : parsed;
        };
        const config = {
            // Server Configuration
            port: parseNumber(process.env.PORT, 5000),
            nodeEnv: process.env.NODE_ENV || 'development',
            // Database Configuration (Supabase)
            supabaseUrl: process.env.SUPABASE_URL || 'https://dummy.supabase.co',
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'dummy_anon_key',
            supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || 'dummy_service_key',
            // OpenAI Configuration
            openaiApiKey: process.env.OPENAI_API_KEY || 'dummy_openai_key',
            // JWT Configuration
            jwtSecret: process.env.JWT_SECRET || 'test_jwt_secret_for_development_only',
            jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET || 'test_jwt_secret_for_development_only') + '_refresh',
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
            jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            // CORS Configuration
            frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
            // Rate Limiting Configuration
            rateLimitWindowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
            rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
            // LangGraph Configuration
            langGraphDebug: parseBoolean(process.env.LANGGRAPH_DEBUG, false),
            langGraphCheckpointSaver: process.env.LANGGRAPH_CHECKPOINT_SAVER || 'supabase'
        };
        // Log configuration in development
        if (config.nodeEnv === 'development') {
            console.log('🔧 Configuration loaded:');
            console.log('  📡 Port:', config.port);
            console.log('  🌍 Environment:', config.nodeEnv);
            console.log('  🌐 Frontend URL:', config.frontendUrl);
            console.log('  🔗 Supabase URL:', config.supabaseUrl ? '✅ Configured' : '❌ Missing');
            console.log('  🤖 OpenAI API Key:', config.openaiApiKey ? '✅ Configured' : '❌ Missing');
            console.log('  🔐 JWT Secret:', config.jwtSecret ? '✅ Configured' : '❌ Missing');
            console.log('  🚦 Rate Limit:', `${config.rateLimitMaxRequests} requests per ${config.rateLimitWindowMs / 1000}s`);
            console.log('  🧠 LangGraph Debug:', config.langGraphDebug);
        }
        return config;
    }
}
// Export singleton instance
exports.config = EnvironmentConfig.getInstance();
exports.default = exports.config;
