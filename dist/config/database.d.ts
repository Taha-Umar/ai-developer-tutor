import { SupabaseClient } from '@supabase/supabase-js';
export interface User {
    id: string;
    name: string;
    username: string;
    email: string;
    password_hash: string;
    preferences: UserPreferences;
    created_at: string;
    updated_at: string;
    last_active: string;
}
export interface UserPreferences {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    preferred_languages: string[];
    learning_style: 'visual' | 'text' | 'hands-on';
    explanation_mode: 'simple' | 'technical';
    topics_of_interest: string[];
}
export interface ConceptMastery {
    id: string;
    user_id: string;
    concept_id: string;
    concept_name: string;
    mastery_level: number;
    attempts: number;
    last_practiced: string;
    dependencies: string[];
    related_concepts: string[];
    created_at: string;
    updated_at: string;
}
export interface LearningPath {
    id: string;
    user_id: string;
    topic: string;
    curriculum: LearningPathItem[];
    progress_percentage: number;
    recommended_next: string[];
    created_at: string;
    updated_at: string;
}
export interface LearningPathItem {
    concept_id: string;
    title: string;
    description: string;
    prerequisites: string[];
    estimated_time: number;
    difficulty: string;
    status: 'not_started' | 'in_progress' | 'completed';
}
export interface ChatSession {
    id: string;
    user_id: string;
    session_name: string;
    current_node: string;
    conversation_history: ChatMessage[];
    context: Record<string, any>;
    available_transitions: string[];
    created_at: string;
    updated_at: string;
    last_activity: string;
}
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    node: string;
    metadata?: Record<string, any>;
}
export interface CodeSubmission {
    id: string;
    user_id: string;
    code: string;
    language: string;
    analysis_results: CodeAnalysisResult;
    feedback_provided: string;
    created_at: string;
}
export interface CodeAnalysisResult {
    line_feedback: Array<{
        line_number: number;
        issue_type: 'syntax' | 'logic' | 'best_practice';
        message: string;
        suggestion: string;
        severity: 'error' | 'warning' | 'info';
    }>;
    overall_feedback: string;
    improvement_suggestions: string[];
    score: number;
}
export interface QuizSession {
    id: string;
    user_id: string;
    questions: QuizQuestion[];
    answers: QuizAnswer[];
    score: number;
    total_questions: number;
    completed: boolean;
    time_taken: number;
    created_at: string;
    completed_at?: string;
}
export interface QuizQuestion {
    id: string;
    type: 'mcq' | 'code_completion' | 'explain_output' | 'debug';
    question: string;
    options?: string[];
    code_snippet?: string;
    correct_answer: string;
    explanation: string;
    difficulty: string;
    concepts: string[];
}
export interface QuizAnswer {
    question_id: string;
    user_answer: string;
    is_correct: boolean;
    time_taken: number;
    timestamp: string;
}
declare class DatabaseService {
    private static instance;
    private supabase;
    private constructor();
    static getInstance(): DatabaseService;
    getClient(): SupabaseClient;
    createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null>;
    getUserById(userId: string): Promise<User | null>;
    getUserByEmail(email: string): Promise<User | null>;
    getUserByUsername(username: string): Promise<User | null>;
    updateUserLastActive(userId: string): Promise<void>;
    updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User | null>;
    createChatSession(sessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at' | 'last_activity'>): Promise<ChatSession | null>;
    updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null>;
    getChatSession(sessionId: string): Promise<ChatSession | null>;
    getUserChatSessions(userId: string): Promise<ChatSession[]>;
    testConnection(): Promise<boolean>;
}
export declare const db: DatabaseService;
export { DatabaseService };
export type { SupabaseClient };
export default db;
//# sourceMappingURL=database.d.ts.map