"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthStore = void 0;
const zustand_1 = require("zustand");
// Mock database to store users (will be replaced with real database)
const mockDatabase = [
    {
        id: "user_123",
        name: "Demo User",
        username: "demo",
        email: "demo@example.com",
        password: "password",
        preferences: {
            difficulty: "beginner",
            language: "english",
            preferredTech: ["react", "javascript"]
        }
    }
];
// Email validation helper
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.useAuthStore = (0, zustand_1.create)((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
            if (username && password) {
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                // Check against mock database
                const foundUser = mockDatabase.find(user => (user.username === username || user.email === username) && user.password === password);
                if (foundUser) {
                    const { password: _, ...userWithoutPassword } = foundUser;
                    set({
                        user: userWithoutPassword,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });
                    return true;
                }
                else {
                    set({
                        error: "Invalid username/email or password",
                        isLoading: false
                    });
                    return false;
                }
            }
            else {
                set({
                    error: "Please enter both username/email and password",
                    isLoading: false
                });
                return false;
            }
        }
        catch (error) {
            set({
                error: "Login failed. Please try again.",
                isLoading: false
            });
            return false;
        }
    },
    signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const { name, username, email, password, confirmPassword } = data;
            // Validation checks
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
            // Check if username or email already exists
            const existingUser = mockDatabase.find(user => user.username === username || user.email === email);
            if (existingUser) {
                if (existingUser.username === username) {
                    set({ error: "Username already exists", isLoading: false });
                }
                else {
                    set({ error: "Email already exists", isLoading: false });
                }
                return false;
            }
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            // Create new user and add to mock database
            const newUser = {
                id: `user_${Date.now()}`, // Generate unique ID
                name: name.trim(),
                username: username.trim(),
                email: email.trim(),
                password: password,
                preferences: {
                    difficulty: "beginner",
                    language: "english",
                    preferredTech: []
                }
            };
            // Add to mock database (in real app, this would be an API call)
            mockDatabase.push(newUser);
            set({
                isLoading: false,
                error: null
            });
            return true;
        }
        catch (error) {
            set({
                error: "Signup failed. Please try again.",
                isLoading: false
            });
            return false;
        }
    },
    logout: () => {
        set({
            user: null,
            isAuthenticated: false,
            error: null
        });
    },
    clearError: () => {
        set({ error: null });
    }
}));
