// API Service for Backend Communication
const API_BASE_URL = 'http://localhost:5000/api';

// Types for API responses
export interface ChatResponse {
  success: boolean;
  ai_response: string;
  current_node: string;
  available_transitions: string[];
  session_context: any;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  preferences?: {
    difficulty: string;
    preferred_languages: string[];
    learning_style: string;
    explanation_mode?: string;
    topics_of_interest?: string[];
    session_count?: number;
    preferred_pace?: string;
  };
}

class ApiService {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status message
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication Methods
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      message: string; 
      data: { user: User; token: string; refreshToken: string } 
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  }

  async signup(userData: { name: string; username: string; email: string; password: string; confirmPassword?: string }): Promise<{ user: User; token: string }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      message: string; 
      data: { user: User; token: string; refreshToken: string } 
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...userData,
        confirmPassword: userData.confirmPassword || userData.password
      }),
    });
    
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
    }
  }

  // Chat Methods
  async sendMessage(message: string, userId?: string, sessionId?: string): Promise<ChatResponse> {
    // For now, use the test endpoint that doesn't require authentication
    const response = await fetch('http://localhost:5000/api/test/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async sendAuthenticatedMessage(message: string): Promise<ChatResponse> {
    return this.makeRequest<ChatResponse>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch('http://localhost:5000/api/test/ping');
      return await response.json();
    } catch (error) {
      throw new Error('Backend server is not responding');
    }
  }

  // Test connection to backend
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  // Progress (Concept Mastery)
  async getProgressOverview(): Promise<any> {
    return this.makeRequest('/progress/overview');
  }

  async upsertConceptMastery(data: {
    concept_id: string;
    concept_name: string;
    mastery_level: number;
    attempts: number;
    dependencies?: string[];
    related_concepts?: string[];
  }): Promise<any> {
    return this.makeRequest('/progress/mastery', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Learning Paths
  async getLearningPaths(): Promise<any> {
    return this.makeRequest('/learning/paths');
  }

  async createLearningPath(data: {
    topic: string;
    curriculum?: any[];
    progress_percentage?: number;
    recommended_next?: string[];
  }): Promise<any> {
    return this.makeRequest('/learning/paths', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLearningPath(pathId: string, updates: any): Promise<any> {
    return this.makeRequest(`/learning/paths/${pathId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Code Submissions
  async analyzeCode(data: {
    code: string;
    language?: string;
    analysis_results?: any;
    feedback_provided?: string;
  }): Promise<any> {
    return this.makeRequest('/code/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCodeSubmissions(): Promise<any> {
    return this.makeRequest('/code/submissions');
  }

  // Quiz Sessions
  async createQuizSession(data: {
    questions: any[];
    answers?: any[];
    score?: number;
    total_questions?: number;
    completed?: boolean;
    time_taken?: number;
  }): Promise<any> {
    return this.makeRequest('/quiz/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuizSession(sessionId: string, updates: any): Promise<any> {
    return this.makeRequest(`/quiz/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getQuizSessions(): Promise<any> {
    return this.makeRequest('/quiz/sessions');
  }
}

export const apiService = new ApiService();
export default apiService; 