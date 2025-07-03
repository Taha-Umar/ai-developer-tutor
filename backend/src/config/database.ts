const { createClient } = require('@supabase/supabase-js');
import { config } from './environment';

// Define database schema types
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
  mastery_level: number; // 0-100
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

class DatabaseService {
  private static instance: DatabaseService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    );
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): any {
    return this.supabase;
  }

  // User operations
  public async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null> {
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

  public async getUserById(userId: string): Promise<User | null> {
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

  public async getUserByEmail(email: string): Promise<User | null> {
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

  public async getUserByUsername(username: string): Promise<User | null> {
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

  public async updateUserLastActive(userId: string): Promise<void> {
    await this.supabase
      .from('users')
      .update({ 
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
  }

  public async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<User | null> {
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
  public async createChatSession(sessionData: Omit<ChatSession, 'id' | 'created_at' | 'updated_at' | 'last_activity'>): Promise<ChatSession | null> {
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

  public async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | null> {
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

  public async getChatSession(sessionId: string): Promise<ChatSession | null> {
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

  public async getUserChatSessions(userId: string): Promise<ChatSession[]> {
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

  // Concept Mastery operations
  public async upsertConceptMastery(record: Omit<ConceptMastery, 'id' | 'created_at' | 'updated_at'>): Promise<ConceptMastery | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('concept_mastery')
      .upsert([{ ...record, created_at: now, updated_at: now }], { onConflict: ['user_id', 'concept_id'] })
      .select()
      .single();
    if (error) {
      console.error('Error upserting concept mastery:', error);
      return null;
    }
    return data;
  }

  public async getUserConceptMastery(userId: string): Promise<ConceptMastery[]> {
    const { data, error } = await this.supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user concept mastery:', error);
      return [];
    }
    return data || [];
  }

  // Learning Path operations
  public async createLearningPath(path: Omit<LearningPath, 'id' | 'created_at' | 'updated_at'>): Promise<LearningPath | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('learning_paths')
      .insert([{ ...path, created_at: now, updated_at: now }])
      .select()
      .single();
    if (error) {
      console.error('Error creating learning path:', error);
      return null;
    }
    return data;
  }

  public async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    const { data, error } = await this.supabase
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user learning paths:', error);
      return [];
    }
    return data || [];
  }

  public async updateLearningPath(pathId: string, updates: Partial<LearningPath>): Promise<LearningPath | null> {
    const { data, error } = await this.supabase
      .from('learning_paths')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', pathId)
      .select()
      .single();
    if (error) {
      console.error('Error updating learning path:', error);
      return null;
    }
    return data;
  }

  // Code Submission operations
  public async createCodeSubmission(submission: Omit<CodeSubmission, 'id' | 'created_at'>): Promise<CodeSubmission | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('code_submissions')
      .insert([{ ...submission, created_at: now }])
      .select()
      .single();
    if (error) {
      console.error('Error creating code submission:', error);
      return null;
    }
    return data;
  }

  public async getUserCodeSubmissions(userId: string): Promise<CodeSubmission[]> {
    const { data, error } = await this.supabase
      .from('code_submissions')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user code submissions:', error);
      return [];
    }
    return data || [];
  }

  // Quiz Session operations
  public async createQuizSession(session: Omit<QuizSession, 'id' | 'created_at'>): Promise<QuizSession | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('quiz_sessions')
      .insert([{ ...session, created_at: now }])
      .select()
      .single();
    if (error) {
      console.error('Error creating quiz session:', error);
      return null;
    }
    return data;
  }

  public async updateQuizSession(sessionId: string, updates: Partial<QuizSession>): Promise<QuizSession | null> {
    const { data, error } = await this.supabase
      .from('quiz_sessions')
      .update({ ...updates })
      .eq('id', sessionId)
      .select()
      .single();
    if (error) {
      console.error('Error updating quiz session:', error);
      return null;
    }
    return data;
  }

  public async getUserQuizSessions(userId: string): Promise<QuizSession[]> {
    const { data, error } = await this.supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user quiz sessions:', error);
      return [];
    }
    return data || [];
  }

  // Test database connection
  public async testConnection(): Promise<boolean> {
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
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const db = DatabaseService.getInstance();

// Export the service class for dependency injection
export { DatabaseService };

// Export types
// export type { SupabaseClient };

export default db; 