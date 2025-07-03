"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt = require('bcryptjs');
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// Email validation helper
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
// Password strength validation
const isStrongPassword = (password) => {
    // At least 6 characters, contains letters and numbers
    return password.length >= 6 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
};
// POST /api/auth/register - User registration
router.post('/register', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { name, username, email, password, confirmPassword } = req.body;
    // Validation
    if (!name?.trim()) {
        throw new errorHandler_1.ValidationError('Name is required');
    }
    if (!username?.trim()) {
        throw new errorHandler_1.ValidationError('Username is required');
    }
    if (!email?.trim()) {
        throw new errorHandler_1.ValidationError('Email is required');
    }
    if (!isValidEmail(email)) {
        throw new errorHandler_1.ValidationError('Please provide a valid email address');
    }
    if (!password) {
        throw new errorHandler_1.ValidationError('Password is required');
    }
    if (!isStrongPassword(password)) {
        throw new errorHandler_1.ValidationError('Password must be at least 6 characters long and contain both letters and numbers');
    }
    if (password !== confirmPassword) {
        throw new errorHandler_1.ValidationError('Passwords do not match');
    }
    // Check if user already exists
    const existingUserByEmail = await database_1.db.getUserByEmail(email);
    if (existingUserByEmail) {
        throw new errorHandler_1.ValidationError('An account with this email already exists');
    }
    const existingUserByUsername = await database_1.db.getUserByUsername(username);
    if (existingUserByUsername) {
        throw new errorHandler_1.ValidationError('This username is already taken');
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    // Create user
    const newUser = await database_1.db.createUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        preferences: {
            difficulty: 'beginner',
            preferred_languages: ['javascript'],
            learning_style: 'text',
            explanation_mode: 'simple',
            topics_of_interest: []
        },
        last_active: new Date().toISOString()
    });
    if (!newUser) {
        throw new Error('Failed to create user account');
    }
    // Generate tokens
    const token = (0, auth_1.generateToken)(newUser);
    const refreshToken = (0, auth_1.generateRefreshToken)(newUser);
    res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to AI Developer Tutor!',
        data: {
            user: {
                id: newUser.id,
                name: newUser.name,
                username: newUser.username,
                email: newUser.email,
                preferences: newUser.preferences
            },
            token,
            refreshToken
        }
    });
}));
// POST /api/auth/login - User login
router.post('/login', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { username, password } = req.body;
    if (!username?.trim()) {
        throw new errorHandler_1.ValidationError('Username or email is required');
    }
    if (!password) {
        throw new errorHandler_1.ValidationError('Password is required');
    }
    // Find user by username or email
    const user = username.includes('@')
        ? await database_1.db.getUserByEmail(username.trim().toLowerCase())
        : await database_1.db.getUserByUsername(username.trim());
    if (!user) {
        throw new errorHandler_1.AuthenticationError('Invalid username/email or password');
    }
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw new errorHandler_1.AuthenticationError('Invalid username/email or password');
    }
    // Update last active
    await database_1.db.updateUserLastActive(user.id);
    // Generate tokens
    const token = (0, auth_1.generateToken)(user);
    const refreshToken = (0, auth_1.generateRefreshToken)(user);
    res.json({
        success: true,
        message: `Welcome back, ${user.name}!`,
        data: {
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                preferences: user.preferences
            },
            token,
            refreshToken
        }
    });
}));
// POST /api/auth/refresh - Refresh access token
router.post('/refresh', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        throw new errorHandler_1.ValidationError('Refresh token is required');
    }
    const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
    if (!decoded) {
        throw new errorHandler_1.AuthenticationError('Invalid refresh token');
    }
    const user = await database_1.db.getUserById(decoded.userId);
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    // Generate new tokens
    const newToken = (0, auth_1.generateToken)(user);
    const newRefreshToken = (0, auth_1.generateRefreshToken)(user);
    res.json({
        success: true,
        data: {
            token: newToken,
            refreshToken: newRefreshToken
        }
    });
}));
// GET /api/auth/me - Get current user profile
router.get('/me', auth_1.authMiddleware, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const user = await database_1.db.getUserById(req.user.id);
    if (!user) {
        throw new errorHandler_1.AuthenticationError('User not found');
    }
    res.json({
        success: true,
        data: {
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                preferences: user.preferences,
                created_at: user.created_at,
                last_active: user.last_active
            }
        }
    });
}));
// PUT /api/auth/profile - Update user profile
router.put('/profile', auth_1.authMiddleware, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { name, preferences } = req.body;
    const userId = req.user.id;
    const updates = {};
    if (name && name.trim()) {
        updates.name = name.trim();
    }
    if (preferences) {
        // Validate preferences
        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        const validLearningStyles = ['visual', 'text', 'hands-on'];
        const validExplanationModes = ['simple', 'technical'];
        if (preferences.difficulty && !validDifficulties.includes(preferences.difficulty)) {
            throw new errorHandler_1.ValidationError('Invalid difficulty level');
        }
        if (preferences.learning_style && !validLearningStyles.includes(preferences.learning_style)) {
            throw new errorHandler_1.ValidationError('Invalid learning style');
        }
        if (preferences.explanation_mode && !validExplanationModes.includes(preferences.explanation_mode)) {
            throw new errorHandler_1.ValidationError('Invalid explanation mode');
        }
        // Get current preferences and merge with updates
        const currentUser = await database_1.db.getUserById(userId);
        updates.preferences = {
            ...currentUser.preferences,
            ...preferences
        };
    }
    // Update user in database
    let updatedUser;
    if (updates.preferences) {
        updatedUser = await database_1.db.updateUserPreferences(userId, updates.preferences);
    }
    else {
        // For name updates, we'd need a separate method in db
        // For now, let's just update preferences
        const currentUser = await database_1.db.getUserById(userId);
        updatedUser = currentUser;
    }
    if (!updatedUser) {
        throw new Error('Failed to update profile');
    }
    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                preferences: updatedUser.preferences
            }
        }
    });
}));
// POST /api/auth/logout - Logout user (client-side token removal)
router.post('/logout', auth_1.authMiddleware, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    // In a more advanced setup, you might want to blacklist the token
    // For now, logout is handled client-side by removing the token
    res.json({
        success: true,
        message: 'Logged out successfully. Thank you for using AI Developer Tutor!'
    });
}));
// GET /api/auth/stats - Get user statistics
router.get('/stats', auth_1.authMiddleware, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    // Get user's chat sessions and learning data
    const chatSessions = await database_1.db.getUserChatSessions(userId);
    const stats = {
        total_sessions: chatSessions.length,
        active_sessions: chatSessions.filter(session => {
            const lastActivity = new Date(session.last_activity);
            const now = new Date();
            const daysSinceActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceActivity <= 7; // Active in last 7 days
        }).length,
        favorite_topics: [], // Would be calculated from session data
        learning_streak: 0, // Would be calculated from daily activity
        concepts_mastered: 0, // Would come from concept mastery table
        total_time_spent: 0 // Would be calculated from session durations
    };
    res.json({
        success: true,
        data: {
            stats
        }
    });
}));
exports.default = router;
