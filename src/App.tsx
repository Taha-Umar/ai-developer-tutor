import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ChatbotInterface from './components/ChatbotInterface';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Login Page - Default route */}
          <Route path="/" element={<LoginPage />} />
          
          {/* Signup Page */}
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Chatbot Interface */}
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <ChatbotInterface />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback route - redirect to login */}
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
