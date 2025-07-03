"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = exports.db = void 0;
const { createClient } = require('@supabase/supabase-js');
const environment_1 = require("./environment");
class DatabaseService {
    constructor() {
        this.supabase = createClient(environment_1.config.supabaseUrl, environment_1.config.supabaseServiceKey);
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    getClient() {
        return this.supabase;
    }
    // User operations
    async createUser(userData) {
        const { data, error } = await this.supabase
            .from('users')
            .insert([{
                ...userData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (error) {
            console.error('Error creating user:', error);
            return null;
        }
        return data;
    }
    async getUserById(userId) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }
        return data;
    }
    async getUserByEmail(email) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        if (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
        return data;
    }
    async getUserByUsername(username) {
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        if (error) {
            console.error('Error fetching user by username:', error);
            return null;
        }
        return data;
    }
    async updateUserLastActive(userId) {
        await this.supabase
            .from('users')
            .update({
            last_active: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
            .eq('id', userId);
    }
    async updateUserPreferences(userId, preferences) {
        const { data, error } = await this.supabase
            .from('users')
            .update({
            preferences,
            updated_at: new Date().toISOString()
        })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            console.error('Error updating user preferences:', error);
            return null;
        }
        return data;
    }
    // Chat session operations
    async createChatSession(sessionData) {
        const now = new Date().toISOString();
        const { data, error } = await this.supabase
            .from('chat_sessions')
            .insert([{
                ...sessionData,
                created_at: now,
                updated_at: now,
                last_activity: now
            }])
            .select()
            .single();
        if (error) {
            console.error('Error creating chat session:', error);
            return null;
        }
        return data;
    }
    async updateChatSession(sessionId, updates) {
        const { data, error } = await this.supabase
            .from('chat_sessions')
            .update({
            ...updates,
            updated_at: new Date().toISOString(),
            last_activity: new Date().toISOString()
        })
            .eq('id', sessionId)
            .select()
            .single();
        if (error) {
            console.error('Error updating chat session:', error);
            return null;
        }
        return data;
    }
    async getChatSession(sessionId) {
        const { data, error } = await this.supabase
            .from('chat_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();
        if (error) {
            console.error('Error fetching chat session:', error);
            return null;
        }
        return data;
    }
    async getUserChatSessions(userId) {
        const { data, error } = await this.supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('last_activity', { ascending: false });
        if (error) {
            console.error('Error fetching user chat sessions:', error);
            return [];
        }
        return data || [];
    }
    // Test database connection
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('count', { count: 'exact' })
                .limit(1);
            if (error) {
                console.error('Database connection test failed:', error);
                return false;
            }
            console.log('✅ Database connection successful');
            return true;
        }
        catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }
}
exports.DatabaseService = DatabaseService;
// Export singleton instance
exports.db = DatabaseService.getInstance();
// Export types
// export type { SupabaseClient };
exports.default = exports.db;
