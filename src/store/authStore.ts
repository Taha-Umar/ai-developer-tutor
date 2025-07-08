import { create } from 'zustand';
import { apiService } from '../services/apiService';

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  preferences?: any; // Will store user preferences from database
}

interface SignupData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

// Email validation helper
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      if (!username || !password) {
        set({ 
          error: "Please enter both username/email and password", 
          isLoading: false 
        });
        return false;
      }

      const response = await apiService.login(username, password);
      
      if (response.user && response.token) {
        set({ 
          user: response.user, 
          isAuthenticated: true, 
          isLoading: false,
          error: null 
        });
        return true;
      } else {
        set({ 
          error: "Invalid response from server", 
          isLoading: false 
        });
        return false;
      }
    } catch (error: any) {
      const errorMessage = error.message || "Login failed. Please try again.";
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      return false;
    }
  },

  signup: async (data: SignupData) => {
    set({ isLoading: true, error: null });
    
    try {
      const { name, username, email, password, confirmPassword } = data;
      
      // Client-side validation
      if (!name.trim()) {
        set({ error: "Name is required", isLoading: false });
        return false;
      }
      
      if (!username.trim()) {
        set({ error: "Username is required", isLoading: false });
        return false;
      }
      
      if (!email.trim()) {
        set({ error: "Email is required", isLoading: false });
        return false;
      }
      
      if (!isValidEmail(email)) {
        set({ error: "Please enter a valid email address", isLoading: false });
        return false;
      }
      
      if (!password) {
        set({ error: "Password is required", isLoading: false });
        return false;
      }
      
      if (password.length < 6) {
        set({ error: "Password must be at least 6 characters long", isLoading: false });
        return false;
      }
      
      if (password !== confirmPassword) {
        set({ error: "Passwords do not match", isLoading: false });
        return false;
      }
      
      // Call backend API to create user
      const response = await apiService.signup({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword
      });
      
      if (response.user && response.token) {
        set({ 
          isLoading: false,
          error: null 
        });
        return true;
      } else {
        set({ 
          error: "Invalid response from server", 
          isLoading: false 
        });
        return false;
      }
      
    } catch (error: any) {
      const errorMessage = error.message || "Signup failed. Please try again.";
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({ 
        user: null, 
        isAuthenticated: false, 
        error: null,
        isLoading: false
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setUser: (user: User) => set({ user }),
})); 