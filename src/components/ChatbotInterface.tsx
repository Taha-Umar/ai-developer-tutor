import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import apiService, { ChatResponse } from '../services/apiService';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  node?: string;
}

const BackToChatButton = ({ onClick }: { onClick: () => void }) => (
  <button
    className="absolute top-4 right-4 px-3 py-1 bg-gray-200 hover:bg-indigo-200 text-gray-700 text-xs rounded shadow-sm transition-all"
    onClick={onClick}
    aria-label="Back to Chat"
  >
    ← Back to Chat
  </button>
);

const ChatbotInterface: React.FC = () => {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState<string>('chat');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [codeSubmissions, setCodeSubmissions] = useState<any[]>([]);
  const [quizSessions, setQuizSessions] = useState<any[]>([]);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [showLearningForm, setShowLearningForm] = useState(false);
  const [learningForm, setLearningForm] = useState({ topic: '', curriculum: '' });
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [codeForm, setCodeForm] = useState({ code: '', language: 'javascript' });
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState({ questions: '', total_questions: 5 });
  const [showMasteryForm, setShowMasteryForm] = useState(false);
  const [masteryForm, setMasteryForm] = useState({ concept_id: '', concept_name: '', mastery_level: 0, attempts: 1 });
  const [formLoading, setFormLoading] = useState(false);
  // State for interactive quiz
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [currentQuizSessionId, setCurrentQuizSessionId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<{ [questionId: string]: string }>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total_questions: number; wrong_explanations: any[] } | null>(null);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);
  const [upgradeQuiz, setUpgradeQuiz] = useState<any | null>(null);
  const [upgradeQuizAnswers, setUpgradeQuizAnswers] = useState<{ [questionId: string]: string }>({});
  const [upgradeQuizSubmitting, setUpgradeQuizSubmitting] = useState(false);
  const [upgradeQuizResult, setUpgradeQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [upgradeQuizLoading, setUpgradeQuizLoading] = useState(false);

  // Test connection on component mount
  useEffect(() => {
    testBackendConnection();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch data when feature changes
  useEffect(() => {
    if (activeFeature === 'progress') {
      setFeatureLoading(true);
      apiService.getProgressOverview().then(res => {
        setProgressData(res.data.progress);
        setFeatureLoading(false);
      }).catch(() => setFeatureLoading(false));
    } else if (activeFeature === 'learning') {
      setFeatureLoading(true);
      apiService.getLearningPaths().then(res => {
        setLearningPaths(res.data.paths);
        setFeatureLoading(false);
      }).catch(() => setFeatureLoading(false));
    } else if (activeFeature === 'feedback') {
      setFeatureLoading(true);
      apiService.getCodeSubmissions().then(res => {
        setCodeSubmissions(res.data.submissions);
        setFeatureLoading(false);
      }).catch(() => setFeatureLoading(false));
    } else if (activeFeature === 'quiz') {
      setFeatureLoading(true);
      apiService.getQuizSessions().then(res => {
        setQuizSessions(res.data.sessions);
        setFeatureLoading(false);
      }).catch(() => setFeatureLoading(false));
    }
  }, [activeFeature]);

  const testBackendConnection = async () => {
    setConnectionStatus('connecting');
    try {
      const isConnected = await apiService.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    } catch (error) {
      setConnectionStatus('disconnected');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    try {
      // Detect if the message references a quiz question
      let quizContext = null;
      if (/quiz|question\s*\d+/i.test(currentMessage)) {
        let quizToUse = null;
        if (currentQuizSessionId) {
          // Use the quiz the user is currently viewing/interacting with
          const quizRes = await apiService.getQuizSessionById(currentQuizSessionId);
          quizToUse = quizRes.data.session;
        } else {
          // Fallback: Find the latest completed quiz session
          const completedQuizzes = quizSessions.filter((q: any) => q.completed);
          if (completedQuizzes.length > 0) {
            const latestQuiz = completedQuizzes.sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())[0];
            const quizRes = await apiService.getQuizSessionById(latestQuiz.id);
            quizToUse = quizRes.data.session;
          }
        }
        if (quizToUse) quizContext = quizToUse;
      }
      // Pass quizContext as part of the message to the backend (if present)
      const response: ChatResponse = await apiService.sendMessage(
        currentMessage,
        user?.id,
        undefined,
        quizContext ? { quizContext } : undefined
      );
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.ai_response,
        timestamp: new Date(),
        node: response.current_node,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `❌ Sorry, I'm having trouble connecting to my AI brain right now. Please make sure the backend server is running on http://localhost:5000 and try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getNodeIcon = (node?: string) => {
    switch (node) {
      case 'code-feedback': return '💻';
      case 'concept-explainer': return '📚';
      case 'quiz-generator': return '🧠';
      case 'mistake-analyzer': return '📊';
      default: return '🤖';
    }
  };

  const getNodeName = (node?: string) => {
    switch (node) {
      case 'code-feedback': return 'Code Feedback';
      case 'concept-explainer': return 'Concept Explainer';
      case 'quiz-generator': return 'Quiz Generator';
      case 'mistake-analyzer': return 'Progress Analyzer';
      default: return 'AI Tutor';
    }
  };

  const features = [
    {
      id: 'feedback',
      name: 'Code Feedback',
      icon: '💻',
      description: 'Get AI feedback on your code',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      prompt: 'review my JavaScript code'
    },
    {
      id: 'explain',
      name: 'Upgrade Level',
      icon: '⬆️',
      description: 'Advance your learning level',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      prompt: 'explain React hooks'
    },
    {
      id: 'quiz',
      name: 'Interactive Quiz',
      icon: '🧠',
      description: 'Test your knowledge',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      prompt: 'create a quiz about arrays'
    },
    {
      id: 'progress',
      name: 'Progress Tracker',
      icon: '📊',
      description: 'View your learning journey',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      prompt: 'analyze my progress'
    }
  ];

  const handleFeatureClick = (feature: any) => {
    setActiveFeature(feature.id);
    setMessage(feature.prompt);
  };

  // Handlers for forms
  const handleLearningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    await apiService.createLearningPath({
      topic: learningForm.topic,
      curriculum: learningForm.curriculum ? [{ title: learningForm.curriculum }] : []
    });
    setShowLearningForm(false);
    setLearningForm({ topic: '', curriculum: '' });
    setFormLoading(false);
    // Refresh
    const res = await apiService.getLearningPaths();
    setLearningPaths(res.data.paths);
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    await apiService.analyzeCode({
      code: codeForm.code,
      language: codeForm.language
    });
    setShowCodeForm(false);
    setCodeForm({ code: '', language: 'javascript' });
    setFormLoading(false);
    // Refresh
    const res = await apiService.getCodeSubmissions();
    setCodeSubmissions(res.data.submissions);
  };

  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    await apiService.createQuizSession({
      questions: quizForm.questions ? [{ question: quizForm.questions }] : [],
      total_questions: quizForm.total_questions
    });
    setShowQuizForm(false);
    setQuizForm({ questions: '', total_questions: 5 });
    setFormLoading(false);
    // Refresh
    const res = await apiService.getQuizSessions();
    setQuizSessions(res.data.sessions);
  };

  const handleMasterySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    await apiService.upsertConceptMastery({
      concept_id: masteryForm.concept_id,
      concept_name: masteryForm.concept_name,
      mastery_level: masteryForm.mastery_level,
      attempts: masteryForm.attempts
    });
    setShowMasteryForm(false);
    setMasteryForm({ concept_id: '', concept_name: '', mastery_level: 0, attempts: 1 });
    setFormLoading(false);
    // Refresh
    const res = await apiService.getProgressOverview();
    setProgressData(res.data.progress);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz session?')) return;
    try {
      await apiService.deleteQuizSession(quizId);
      setQuizSessions(prev => prev.filter(q => q.id !== quizId));
    } catch (err) {
      alert('Failed to delete quiz session.');
    }
  };

  // Handler to start answering a quiz
  const handleStartQuiz = (quizId: string) => {
    setActiveQuizId(quizId);
    setCurrentQuizSessionId(quizId);
    setQuizAnswers({});
    setQuizSubmitting(false);
    setQuizResult(null);
  };

  // Handler for selecting an answer
  const handleSelectAnswer = (questionId: string, value: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  // Handler to submit quiz answers
  const handleSubmitQuiz = async (quiz: any) => {
    setQuizSubmitting(true);
    try {
      const answers = quiz.questions.map((q: any) => ({
        question_id: q.id,
        user_answer: quizAnswers[q.id],
        time_taken: 0 // Optionally track time per question
      }));
      const res = await apiService.submitQuizAnswers(quiz.id, answers);
      setQuizResult(res.data);
      setCurrentQuizSessionId(quiz.id);
      // Refresh quiz sessions to update completed status/score
      const updated = await apiService.getQuizSessions();
      setQuizSessions(updated.data.sessions);
    } catch (err) {
      alert('Failed to submit quiz.');
    }
    setQuizSubmitting(false);
  };

  const handleDeleteCode = async (submissionId: string) => {
    if (!window.confirm('Are you sure you want to delete this code submission?')) return;
    setDeletingCodeId(submissionId);
    try {
      await apiService.deleteCodeSubmission(submissionId);
      setCodeSubmissions(prev => prev.filter(sub => sub.id !== submissionId));
    } catch (err) {
      alert('Failed to delete code submission.');
    } finally {
      setDeletingCodeId(null);
    }
  };

  const handleStartUpgradeQuiz = async () => {
    setUpgradeQuizLoading(true);
    setUpgradeQuiz(null);
    setUpgradeQuizAnswers({});
    setUpgradeQuizResult(null);
    // Determine difficulty
    const difficulty = user?.preferences?.difficulty || 'beginner';
    // Generate quiz
    const res = await apiService.createQuizSession({
      topic: 'JavaScript',
      total_questions: 10,
      difficulty
    });
    setUpgradeQuiz(res.data.session);
    setUpgradeQuizLoading(false);
  };

  const handleUpgradeQuizSelect = (questionId: string, value: string) => {
    setUpgradeQuizAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleUpgradeQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeQuiz) return;
    setUpgradeQuizSubmitting(true);
    // Prepare answers
    const answers = upgradeQuiz.questions.map((q: any) => ({
      question_id: q.id,
      user_answer: upgradeQuizAnswers[q.id],
      time_taken: 0
    }));
    const res = await apiService.submitQuizAnswers(upgradeQuiz.id, answers);
    const score = res.data.score;
    const total = res.data.total_questions;
    const passed = score >= 6;
    setUpgradeQuizResult({ score, total, passed });
    // If passed, upgrade user level
    if (passed && user) {
      let newLevel = user.preferences.difficulty;
      if (newLevel === 'beginner') newLevel = 'intermediate';
      else if (newLevel === 'intermediate') newLevel = 'advanced';
      else newLevel = 'advanced';
      const updated = await apiService.updateUserPreferences({ ...user.preferences, difficulty: newLevel });
      if (updated && updated.data && updated.data.user) {
        setUser(updated.data.user);
      }
    }
    setUpgradeQuizSubmitting(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold text-gray-900">
                    AI Developer Tutor
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-3 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full border border-indigo-100">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center glow-avatar">
                  <span className="text-white text-sm font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Welcome, {user?.name || user?.username}</div>
                  <div className="text-gray-500 text-xs">Level: {user?.preferences?.difficulty || 'Beginner'}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 glow-btn"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="w-full py-6 pl-2 pr-4 sm:pl-4 sm:pr-8 lg:pl-8 lg:pr-16 font-sans" style={{ fontFamily: 'Inter, Poppins, Space Grotesk, sans-serif' }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)] w-full">
          {/* Sidebar - Feature Selection */}
          <div className="lg:col-span-1">
            <div className="sidebar-glass p-6 h-full">
              <div className="sidebar-left-accent" />
              <div className="sidebar-shimmer" />
              {/* Sidebar Section Header */}
              <div className="sidebar-section-header mb-6 mt-0">
                <span className="header-accent"></span>
                AI Tutor Features
              </div>
              <div className="space-y-3">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature)}
                    className={`w-full text-left p-4 rounded-xl feature-card glow-btn ${
                      activeFeature === feature.id
                        ? `bg-gradient-to-r ${feature.color} text-white shadow-lg`
                        : `${feature.bgColor} hover:shadow-md border border-gray-200 hover:border-gray-300`
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{feature.icon}</span>
                      <div className="flex-1">
                        <div className={`font-medium ${
                          activeFeature === feature.id ? 'text-white' : 'text-gray-900'
                        }`}>
                          {feature.name}
                        </div>
                        <div className={`text-sm ${
                          activeFeature === feature.id ? 'text-white/80' : feature.textColor
                        }`}>
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Connection Status Section Header */}
              <div className="mt-8 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="sidebar-section-header mb-3 mt-0">
                  <span className="header-accent"></span>
                  Connection Status
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium capitalize text-gray-600">
                    {connectionStatus === 'connected' ? 'Backend Connected' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Backend Offline'}
                  </span>
                </div>
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={testBackendConnection}
                    className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Retry Connection
                  </button>
                )}
              </div>
              {/* Session Info Section Header */}
              <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                <div className="sidebar-section-header mb-3 mt-0">
                  <span className="header-accent"></span>
                  Session Info
                </div>
                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Messages:</span>
                    <span className="font-medium">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Level:</span>
                    <span className="font-medium capitalize">{user?.preferences?.difficulty || 'Beginner'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Feature Panel or Chat Interface */}
          <div className="lg:col-span-3">
            {/* Glassmorphic + glowing border for chat container */}
            <div className="chat-main-container glassmorphic glow-border h-full flex flex-col overflow-hidden px-0 md:px-8 py-0 md:py-8 transition-all duration-300">
              {activeFeature === 'chat' && (
                <>
                  {/* Chat Header */}
                  <div className="bg-white/80 backdrop-blur-md p-6 rounded-t-3xl shadow-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">AI Tutor Chat</h2>
                        <p className="text-indigo-500 text-sm mt-1">
                          Real-time AI assistance powered by OpenAI
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                          connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                          'bg-red-400'
                        }`}></div>
                        <span className="text-sm text-gray-500">
                          {connectionStatus === 'connected' ? 'Online' :
                           connectionStatus === 'connecting' ? 'Connecting' :
                           'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Chat Messages Area */}
                  <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gradient-to-b from-white/40 to-white/10 chat-scroll text-left">
                    {messages.length === 0 ? (
                      // Welcome Screen
                      <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                        <div className="relative">
                          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.847a4.5 4.5 0 003.09 3.09L15.75 12l-2.847.813a4.5 4.5 0 00-3.09 3.09z" />
                            </svg>
                          </div>
                          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="max-w-md">
                          <h3 className="text-2xl font-bold text-gray-900 mb-3">
                            Welcome to your AI Tutor! 🤖✨
                          </h3>
                          <p className="text-gray-600 leading-relaxed mb-6">
                            I'm powered by real OpenAI technology and ready to help you learn programming! 
                            Try the buttons below or ask me anything about coding.
                          </p>
                          
                          {/* Quick Start Suggestions */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            {[
                              { text: "Explain React hooks", icon: "⚛️" },
                              { text: "Review my JavaScript", icon: "📝" },
                              { text: "Quiz me on arrays", icon: "🧠" },
                              { text: "Show my progress", icon: "📊" }
                            ].map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => setMessage(suggestion.text)}
                                className="p-3 bg-white/60 hover:bg-white/80 rounded-lg border border-gray-200 hover:border-indigo-300 transition-all duration-200 transform hover:scale-105 text-sm font-medium text-gray-700 hover:text-indigo-700"
                              >
                                <span className="mr-2">{suggestion.icon}</span>
                                {suggestion.text}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Messages
                      <div className="space-y-6">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                          >
                            <div className={`max-w-2xl w-full ${msg.type === 'user' ? 'order-1' : 'order-2'}`}> {/* narrower for readability */}
                              <div className={`flex items-start space-x-3 ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-md glow-avatar ${
                                  msg.type === 'user' 
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600' 
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}>
                                  {msg.type === 'user' ? (
                                    <span className="text-white text-base font-semibold">
                                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                  ) : (
                                    <span className="text-white text-base">
                                      {getNodeIcon(msg.node)}
                                    </span>
                                  )}
                                </div>
                                {/* Message */}
                                <div className={`rounded-3xl px-6 py-4 message-bubble shadow-lg ${
                                  msg.type === 'user'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                    : 'bg-white/90 text-gray-900 border border-gray-200'
                                }`}>
                                  {msg.type === 'ai' && msg.node && (
                                    <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center">
                                      <span className="mr-1">{getNodeIcon(msg.node)}</span>
                                      {getNodeName(msg.node)}
                                    </div>
                                  )}
                                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                  </div>
                                  <div className={`text-xs mt-2 ${
                                    msg.type === 'user' ? 'text-indigo-100' : 'text-gray-500'
                                  }`}>
                                    {msg.timestamp.toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Loading indicator */}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-md glow-avatar">
                                <span className="text-white text-base">🤖</span>
                              </div>
                              <div className="bg-white/90 rounded-3xl px-6 py-4 border border-gray-200 shadow-lg">
                                <div className="flex space-x-1">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                                  <div className="w-2 h-2 bg-gray-400 rounded-full loading-dot"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                  {/* Chat Input */}
                  <div className="p-4 md:p-8 bg-white/90 backdrop-blur-sm border-t border-gray-200 rounded-b-3xl">
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Ask your AI tutor anything about coding..."
                          className="w-full px-6 py-4 pr-12 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500 bg-white/95 shadow-lg resize-none chat-input text-base"
                          rows={message.includes('\n') ? 3 : 1}
                          disabled={isLoading || connectionStatus === 'disconnected'}
                        />
                        <button 
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 transition-colors duration-200"
                          onClick={() => setMessage('')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || isLoading || connectionStatus === 'disconnected'}
                        className={`px-8 py-4 rounded-2xl font-medium shadow-lg flex items-center space-x-2 btn-press text-base glow-btn ${
                          !message.trim() || isLoading || connectionStatus === 'disconnected'
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200'
                        }`}
                      >
                        <span>{isLoading ? 'Sending...' : 'Send'}</span>
                        {isLoading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {/* Feature Status */}
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>
                          {connectionStatus === 'connected' 
                            ? 'Connected to OpenAI-powered backend' 
                            : 'Backend offline - Please start your server'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>Secure</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>AI-Powered</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {activeFeature === 'progress' && (
                <div className="p-8 relative">
                  <BackToChatButton onClick={() => setActiveFeature('chat')} />
                  <h2 className="text-2xl font-bold mb-8 flex items-center"><span className="mr-2">📊</span> Progress Timeline</h2>
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-xl">
                      <ol className="relative border-l-4 border-indigo-200 ml-6">
                        {/* Beginner */}
                        <li className="mb-10 ml-6">
                          <span className={`absolute -left-6 flex items-center justify-center w-12 h-12 rounded-full border-4 ${user?.preferences?.difficulty === 'beginner' ? 'bg-blue-500 border-blue-300 text-white scale-110 shadow-lg' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                            <span className="text-2xl font-bold">1</span>
                          </span>
                          <h3 className={`font-semibold text-lg ${user?.preferences?.difficulty === 'beginner' ? 'text-blue-700' : 'text-gray-700'}`}>Beginner</h3>
                          <p className="text-gray-500">You started your journey! Learn the basics of programming and JavaScript.</p>
                          {user?.preferences?.difficulty === 'beginner' && (
                            <div className="mt-2 text-blue-600 font-semibold">You are here 🚩</div>
                          )}
                        </li>
                        {/* Intermediate */}
                        <li className="mb-10 ml-6">
                          <span className={`absolute -left-6 flex items-center justify-center w-12 h-12 rounded-full border-4 ${user?.preferences?.difficulty === 'intermediate' ? 'bg-green-500 border-green-300 text-white scale-110 shadow-lg' : user?.preferences?.difficulty === 'beginner' ? 'bg-gray-200 border-gray-300 text-gray-500' : 'bg-green-200 border-green-300 text-green-700'}`}>
                            <span className="text-2xl font-bold">2</span>
                          </span>
                          <h3 className={`font-semibold text-lg ${user?.preferences?.difficulty === 'intermediate' ? 'text-green-700' : 'text-gray-700'}`}>Intermediate</h3>
                          <p className="text-gray-500">You've mastered the basics! Work on more complex problems and real-world projects.</p>
                          {user?.preferences?.difficulty === 'intermediate' && (
                            <div className="mt-2 text-green-600 font-semibold">You are here 🚩</div>
                          )}
                          {user?.preferences?.difficulty === 'advanced' && (
                            <div className="mt-2 text-green-700 font-semibold">Achieved!</div>
                          )}
                        </li>
                        {/* Advanced */}
                        <li className="ml-6">
                          <span className={`absolute -left-6 flex items-center justify-center w-12 h-12 rounded-full border-4 ${user?.preferences?.difficulty === 'advanced' ? 'bg-purple-500 border-purple-300 text-white scale-110 shadow-lg' : 'bg-gray-200 border-gray-300 text-gray-500'}`}>
                            <span className="text-2xl font-bold">3</span>
                          </span>
                          <h3 className={`font-semibold text-lg ${user?.preferences?.difficulty === 'advanced' ? 'text-purple-700' : 'text-gray-700'}`}>Advanced</h3>
                          <p className="text-gray-500">You're a pro! Tackle advanced topics, algorithms, and system design.</p>
                          {user?.preferences?.difficulty === 'advanced' && (
                            <div className="mt-2 text-purple-700 font-semibold">You are here 🚩<br/>🎉 Congrats, you have reached the max level!</div>
                          )}
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
              {activeFeature === 'learning' && (
                <div className="p-8 relative">
                  <BackToChatButton onClick={() => setActiveFeature('chat')} />
                  <h2 className="text-2xl font-bold mb-4 flex items-center"><span className="mr-2">📚</span> Learning Paths</h2>
                  <button className="mb-4 px-4 py-2 bg-indigo-500 text-white rounded" onClick={() => setShowLearningForm(v => !v)}>
                    {showLearningForm ? 'Cancel' : '+ Add Learning Path'}
                  </button>
                  {showLearningForm && (
                    <form className="mb-4 space-y-2" onSubmit={handleLearningSubmit}>
                      <input className="border px-2 py-1 rounded w-40" placeholder="Topic" value={learningForm.topic} onChange={e => setLearningForm(f => ({ ...f, topic: e.target.value }))} required />
                      <input className="border px-2 py-1 rounded w-64" placeholder="Curriculum (comma separated)" value={learningForm.curriculum} onChange={e => setLearningForm(f => ({ ...f, curriculum: e.target.value }))} />
                      <button className="bg-green-500 text-white px-3 py-1 rounded" type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save'}</button>
                    </form>
                  )}
                  {featureLoading ? <div>Loading...</div> : learningPaths.length > 0 ? (
                    <ul className="list-disc ml-6">
                      {learningPaths.map((path: any) => (
                        <li key={path.id}>
                          <b>{path.topic}</b> - Progress: {path.progress_percentage}%
                        </li>
                      ))}
                    </ul>
                  ) : <div>No learning paths found.</div>}
                </div>
              )}
              {activeFeature === 'feedback' && (
                <div className="p-8 relative">
                  <BackToChatButton onClick={() => setActiveFeature('chat')} />
                  <h2 className="text-2xl font-bold mb-4 flex items-center"><span className="mr-2">💻</span> Code Submissions</h2>
                  <button className="mb-4 px-4 py-2 bg-indigo-500 text-white rounded" onClick={() => setShowCodeForm(v => !v)}>
                    {showCodeForm ? 'Cancel' : '+ Submit Code'}
                  </button>
                  {showCodeForm && (
                    <form className="mb-4 space-y-2" onSubmit={handleCodeSubmit}>
                      <textarea className="border px-2 py-1 rounded w-full" rows={3} placeholder="Paste your code here" value={codeForm.code} onChange={e => setCodeForm(f => ({ ...f, code: e.target.value }))} required />
                      <select className="border px-2 py-1 rounded w-40" value={codeForm.language} onChange={e => setCodeForm(f => ({ ...f, language: e.target.value }))}>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript</option>
                        <option value="java">Java</option>
                      </select>
                      <button className="bg-green-500 text-white px-3 py-1 rounded" type="submit" disabled={formLoading}>{formLoading ? 'Submitting...' : 'Submit'}</button>
                    </form>
                  )}
                  {featureLoading ? <div>Loading...</div> : codeSubmissions.length > 0 ? (
                    <ul className="list-disc ml-6">
                      {codeSubmissions.map((sub: any) => (
                        <li key={sub.id} className="mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <b>{sub.language}</b> - {sub.code.slice(0, 30)}... <span className="text-xs text-gray-500">({new Date(sub.created_at).toLocaleString()})</span>
                            </div>
                            <button
                              className="ml-4 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition disabled:opacity-50"
                              onClick={() => handleDeleteCode(sub.id)}
                              disabled={deletingCodeId === sub.id}
                              title="Delete Code Submission"
                            >
                              {deletingCodeId === sub.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                          {sub.feedback_provided && (
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 whitespace-pre-line">
                              <b>AI Feedback:</b><br />{sub.feedback_provided}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <div>No code submissions yet.</div>}
                </div>
              )}
              {activeFeature === 'quiz' && (
                <div className="p-8 relative">
                  <BackToChatButton onClick={() => setActiveFeature('chat')} />
                  <h2 className="text-2xl font-bold mb-4 flex items-center"><span className="mr-2">🧠</span> Quiz Sessions</h2>
                  <button className="mb-4 px-4 py-2 bg-indigo-500 text-white rounded" onClick={() => setShowQuizForm(v => !v)}>
                    {showQuizForm ? 'Cancel' : '+ Start Quiz'}
                  </button>
                  {showQuizForm && (
                    <form className="mb-4 space-y-2" onSubmit={handleQuizSubmit}>
                      <input className="border px-2 py-1 rounded w-64" placeholder="Quiz Topic/Question" value={quizForm.questions} onChange={e => setQuizForm(f => ({ ...f, questions: e.target.value }))} required />
                      <input className="border px-2 py-1 rounded w-24" type="number" min={1} max={20} placeholder="Total Questions" value={quizForm.total_questions} onChange={e => setQuizForm(f => ({ ...f, total_questions: Number(e.target.value) }))} required />
                      <button className="bg-green-500 text-white px-3 py-1 rounded" type="submit" disabled={formLoading}>{formLoading ? 'Starting...' : 'Start'}</button>
                    </form>
                  )}
                  {featureLoading ? <div>Loading...</div> : quizSessions.length > 0 ? (
                    <ul className="list-disc ml-6">
                      {quizSessions.map((quiz: any) => (
                        <li key={quiz.id} style={{ marginBottom: '1em' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <strong>Score:</strong> {quiz.score}/{quiz.total_questions} - {quiz.completed ? 'Completed' : 'In Progress'} <span className="text-xs text-gray-500">({new Date(quiz.created_at).toLocaleString()})</span>
                            </div>
                            <button
                              className="ml-4 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              title="Delete Quiz Session"
                            >
                              Delete
                            </button>
                          </div>
                          {quiz.questions && quiz.questions.length > 0 && (
                            <div>
                              <strong>Questions:</strong>
                              {/* Interactive MCQ Quiz if not completed and selected */}
                              {activeQuizId === quiz.id && !quiz.completed ? (
                                <form onSubmit={e => { e.preventDefault(); handleSubmitQuiz(quiz); }}>
                                  <ul className="list-disc ml-6">
                                    {quiz.questions.map((q: any, idx: number) => (
                                      <li key={q.id} className="mb-4">
                                        <div className="font-medium text-gray-900 mb-1">Q{idx + 1}. {q.question}</div>
                                        {q.options && q.options.length > 0 && (
                                          <ul className="ml-4">
                                            {q.options.map((opt: string, oidx: number) => (
                                              <li key={oidx} className="flex items-center mb-1">
                                                <label className="flex items-center cursor-pointer">
                                                  <input
                                                    type="radio"
                                                    name={`q_${q.id}`}
                                                    value={String.fromCharCode(97 + oidx)}
                                                    checked={quizAnswers[q.id] === String.fromCharCode(97 + oidx)}
                                                    onChange={() => handleSelectAnswer(q.id, String.fromCharCode(97 + oidx))}
                                                    className="mr-2"
                                                  />
                                                  <span className="inline-block w-6 h-6 mr-2 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-300">
                                                    {String.fromCharCode(97 + oidx)}
                                                  </span>
                                                  <span className="text-gray-800">{opt}</span>
                                                </label>
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                  <button
                                    type="submit"
                                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                                    disabled={quizSubmitting || quiz.questions.some((q: any) => !quizAnswers[q.id])}
                                  >
                                    {quizSubmitting ? 'Submitting...' : 'Submit Quiz'}
                                  </button>
                                  {/* Show result after submission */}
                                  {quizResult && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded">
                                      <div className="font-semibold mb-2">Score: {quizResult.score} / {quizResult.total_questions}</div>
                                      {quizResult.wrong_explanations.length > 0 ? (
                                        <div>
                                          <div className="font-medium mb-1">Explanations for incorrect answers:</div>
                                          <ul className="list-disc ml-6">
                                            {quizResult.wrong_explanations.map((w, i) => (
                                              <li key={i} className="mb-2">
                                                <div className="font-semibold">{w.question}</div>
                                                <div className="text-sm text-gray-700">Correct answer: <b>{w.correct_answer}</b></div>
                                                <div className="text-sm text-gray-700">{w.explanation}</div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : (
                                        <div className="text-green-700 font-medium">All answers correct! 🎉</div>
                                      )}
                                    </div>
                                  )}
                                </form>
                              ) : quiz.completed ? (
                                // Completed quiz: show score and explanations for wrong answers
                                <div className="mt-2 p-4 bg-blue-50 rounded">
                                  <div className="font-semibold mb-2">Score: {quiz.score} / {quiz.total_questions}</div>
                                  {quiz.answers && quiz.answers.length > 0 && quiz.questions && (
                                    <>
                                      {quiz.answers.filter((a: any) => !a.is_correct).length > 0 ? (
                                        <div>
                                          <div className="font-medium mb-1">Explanations for incorrect answers:</div>
                                          <ul className="list-disc ml-6">
                                            {quiz.answers.filter((a: any) => !a.is_correct).map((a: any, i: number) => {
                                              const q = quiz.questions.find((qq: any) => qq.id === a.question_id);
                                              return q ? (
                                                <li key={i} className="mb-2">
                                                  <div className="font-semibold">{q.question}</div>
                                                  <div className="text-sm text-gray-700">Correct answer: <b>{q.correct_answer}</b></div>
                                                  <div className="text-sm text-gray-700">{q.explanation}</div>
                                                </li>
                                              ) : null;
                                            })}
                                          </ul>
                                        </div>
                                      ) : (
                                        <div className="text-green-700 font-medium">All answers correct! 🎉</div>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                // Not started: show start button
                                <button
                                  className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded"
                                  onClick={() => handleStartQuiz(quiz.id)}
                                >
                                  Start Quiz
                                </button>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : <div>No quiz sessions yet.</div>}
                </div>
              )}
              {activeFeature === 'explain' && (
                <div className="p-8 relative">
                  <BackToChatButton onClick={() => setActiveFeature('chat')} />
                  <h2 className="text-2xl font-bold mb-4 flex items-center"><span className="mr-2">⬆️</span> Upgrade Level Quiz</h2>
                  {upgradeQuizLoading ? (
                    <div>Loading quiz...</div>
                  ) : upgradeQuizResult ? (
                    <div className="mt-4 p-4 bg-blue-50 rounded">
                      <div className="font-semibold mb-2">Score: {upgradeQuizResult.score} / {upgradeQuizResult.total}</div>
                      {upgradeQuizResult.passed ? (
                        user?.preferences?.difficulty === 'advanced' ? (
                          <div className="text-green-700 font-medium">🎉 Congrats on passing the quiz! You have already achieved the maximum level. You may retake the quiz for practice purposes.</div>
                        ) : (
                          <div className="text-green-700 font-medium">🎉 Congrats! You have been upgraded to the next level.</div>
                        )
                      ) : (
                        <div className="text-red-700 font-medium">Sorry, you need at least 6 correct answers to upgrade. Please try again after more preparation.</div>
                      )}
                      <button className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded" onClick={handleStartUpgradeQuiz}>Retake Quiz</button>
                    </div>
                  ) : upgradeQuiz ? (
                    <form onSubmit={handleUpgradeQuizSubmit}>
                      <ul className="list-disc ml-6">
                        {upgradeQuiz.questions.map((q: any, idx: number) => (
                          <li key={q.id} className="mb-4">
                            <div className="font-medium text-gray-900 mb-1">Q{idx + 1}. {q.question}</div>
                            {q.options && q.options.length > 0 && (
                              <ul className="ml-4">
                                {q.options.map((opt: string, oidx: number) => (
                                  <li key={oidx} className="flex items-center mb-1">
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`q_${q.id}`}
                                        value={String.fromCharCode(97 + oidx)}
                                        checked={upgradeQuizAnswers[q.id] === String.fromCharCode(97 + oidx)}
                                        onChange={() => handleUpgradeQuizSelect(q.id, String.fromCharCode(97 + oidx))}
                                        className="mr-2"
                                      />
                                      <span className="inline-block w-6 h-6 mr-2 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-300">
                                        {String.fromCharCode(97 + oidx)}
                                      </span>
                                      <span className="text-gray-800">{opt}</span>
                                    </label>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="submit"
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                        disabled={upgradeQuizSubmitting || upgradeQuiz.questions.some((q: any) => !upgradeQuizAnswers[q.id])}
                      >
                        {upgradeQuizSubmitting ? 'Submitting...' : 'Submit Test'}
                      </button>
                    </form>
                  ) : (
                    <button className="px-4 py-2 bg-indigo-500 text-white rounded" onClick={handleStartUpgradeQuiz}>Start Upgrade Quiz</button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatbotInterface; 