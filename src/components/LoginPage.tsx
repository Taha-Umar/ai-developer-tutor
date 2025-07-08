import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Get success message from signup redirect
  const successMessage = location.state?.message;

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when component unmounts or inputs change
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      navigate('/chat');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-start md:justify-center p-4">
      {/* Left: Login Card */}
      <div className="auth-glass-card w-full md:w-[420px] p-8 md:p-8 relative z-10">
        <div className="auth-accent-bar" />
        {/* Header */}
        <div className="mb-8">
          <div className="auth-section-header">
            <span className="auth-header-accent"></span>
            Sign In
          </div>
          <p className="text-gray-600 text-left pl-3">Sign in to start your personalized learning journey</p>
        </div>

        {/* Success Message from Signup */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-700 text-sm">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

 

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 text-gray-900 placeholder-gray-500"
              placeholder="Enter your username or email"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 text-gray-900 placeholder-gray-500"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 auth-btn flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-left pl-3">
          <p className="text-sm text-gray-600 mb-4">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
          <p className="text-sm text-gray-500">
            Welcome to your personalized AI coding tutor platform
          </p>
        </div>
      </div>
      {/* Right: Illustration, Code Window, Tagline (hidden on mobile) */}
      <div className="hidden md:flex flex-col items-center justify-center flex-1 h-full pl-12 pr-4 z-0">
        {/* SVG Illustration */}
        <div className="mb-8">
          <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="110" cy="160" rx="90" ry="18" fill="#a78bfa22" />
            <rect x="60" y="40" width="100" height="60" rx="16" fill="#fff" stroke="#a78bfa" strokeWidth="2" />
            <rect x="75" y="55" width="70" height="10" rx="4" fill="#a78bfa" fillOpacity="0.2" />
            <rect x="75" y="70" width="40" height="8" rx="4" fill="#38bdf8" fillOpacity="0.2" />
            <circle cx="110" cy="30" r="18" fill="#a78bfa" fillOpacity="0.7" stroke="#38bdf8" strokeWidth="3" />
            <ellipse cx="110" cy="30" rx="7" ry="7" fill="#fff" />
            <rect x="100" y="22" width="20" height="6" rx="3" fill="#fff" fillOpacity="0.5" />
          </svg>
        </div>
        {/* Mock Code Window */}
        <div className="w-[320px] max-w-full bg-white/80 rounded-xl shadow-lg border border-[#a78bfa55] p-5 mb-8 font-mono text-sm text-gray-800 relative overflow-hidden">
          <div className="flex space-x-2 mb-3">
            <span className="w-3 h-3 bg-red-400 rounded-full inline-block"></span>
            <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block"></span>
            <span className="w-3 h-3 bg-green-400 rounded-full inline-block"></span>
          </div>
          <div className="animate-pulse">
            <span className="text-purple-600">&gt; </span>
            <span>AI is ready to help you code...</span>
          </div>
          <div className="flex mt-2 space-x-1 animate-typing">
            <span className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></span>
            <span className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></span>
          </div>
        </div>
        {/* Tagline */}
        <div className="text-2xl font-extrabold text-gray-800 text-center leading-snug max-w-md">
          Level up your coding with <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-400">AI-powered guidance</span>.
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 