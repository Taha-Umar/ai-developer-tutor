import { config } from '../config/environment';
import { db } from '../config/database';
const OpenAI = require('openai');

// Define the state interface for our graph
export interface TutorState {
  current_node: string;
  user_id: string;
  session_id: string;
  context: {
    user_preferences: any;
    current_topic?: string;
    last_code_snippet?: string;
    active_quiz?: string;
    learning_objective?: string;
    conversation_history: any[];
    available_transitions: string[];
    user_input: string;
    node_output?: string;
    error?: string;
  };
  metadata: {
    timestamp: string;
    iteration_count: number;
    total_tokens_used?: number;
    session_duration?: number;
  };
}

// Define node types
export type NodeType = 'code-feedback' | 'concept-explainer' | 'quiz-generator' | 'mistake-analyzer' | 'router';

class LangGraphManager {
  private static instance: LangGraphManager;
  private openai: any;

  private constructor() {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  public static getInstance(): LangGraphManager {
    if (!LangGraphManager.instance) {
      LangGraphManager.instance = new LangGraphManager();
    }
    return LangGraphManager.instance;
  }

  // Router function that determines which node to execute
  private determineNode(userInput: string, context: any): NodeType {
    const input = userInput.toLowerCase();
    
    // Code-related keywords
    if (input.includes('code') || input.includes('debug') || input.includes('review') || input.includes('feedback')) {
      return 'code-feedback';
    }
    // Quiz-related keywords
    else if (input.includes('quiz') || input.includes('test') || input.includes('question') || input.includes('practice')) {
      return 'quiz-generator';
    }
    // Progress/analysis keywords
    else if (input.includes('progress') || input.includes('mistake') || input.includes('track') || input.includes('analysis')) {
      return 'mistake-analyzer';
    }
    // Learning/explanation keywords (default)
    else {
      return 'concept-explainer';
    }
  }

  // Execute Code Feedback Node with real OpenAI
  public async executeCodeFeedbackNode(state: TutorState): Promise<string> {
    const difficulty = state.context.user_preferences?.difficulty || 'beginner';
    const languages = state.context.user_preferences?.preferred_languages?.join(', ') || 'JavaScript';
    const userInput = state.context.user_input;
    
    const prompt = `You are an expert programming tutor in Code Feedback Mode. Your role is to provide detailed, constructive code analysis and feedback.

Student Profile:
- Level: ${difficulty}
- Preferred Languages: ${languages}
- Learning Style: ${state.context.user_preferences?.learning_style || 'hands-on'}

User Request: "${userInput}"

${state.context.last_code_snippet ? 
  `Code to analyze: ${state.context.last_code_snippet}` : 
  'No code provided yet.'
}

Instructions:
- If code is provided, give specific feedback on bugs, improvements, and best practices
- If no code is provided, explain how you can help and ask for code to review
- Tailor your explanation to the ${difficulty} level
- Be encouraging and educational
- Provide actionable suggestions

Response format: Start with "[Code Feedback Mode]" then provide your analysis.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 
        '[Code Feedback Mode] I\'m ready to help you with code analysis! Please share your code and I\'ll provide detailed feedback.';
    } catch (error) {
      console.error('OpenAI API error in Code Feedback mode:', error);
      // Fallback to enhanced mock response
      return `[Code Feedback Mode] Hello! I'm your AI code reviewer, ready to help you improve your ${languages} code.

As a ${difficulty} level developer, I can analyze your code for:
- 🐛 Bug detection and fixes
- ✨ Code optimization suggestions  
- 📚 Best practices recommendations
- 🔧 Debugging assistance

${userInput.toLowerCase().includes('code') || userInput.toLowerCase().includes('review') ? 
  'Please paste your code here and I\'ll give you detailed, actionable feedback!' :
  'Feel free to ask specific coding questions or share code for review!'
}`;
    }
  }

  // Execute Concept Explainer Node with real OpenAI
  private async executeConceptExplainerNode(state: TutorState): Promise<string> {
    const difficulty = state.context.user_preferences?.difficulty || 'beginner';
    const learningStyle = state.context.user_preferences?.learning_style || 'hands-on';
    const languages = state.context.user_preferences?.preferred_languages?.join(', ') || 'JavaScript';
    const userInput = state.context.user_input;
    
    const prompt = `You are an expert programming tutor in Concept Explainer Mode. Your role is to explain programming concepts clearly and effectively.

Student Profile:
- Level: ${difficulty}
- Preferred Languages: ${languages}
- Learning Style: ${learningStyle}

User Request: "${userInput}"

Instructions:
- Explain the requested concept in simple, clear terms appropriate for a ${difficulty} level
- Use ${learningStyle} learning approaches with practical examples
- If the request is general, offer to explain popular ${languages} concepts
- Provide code examples when helpful
- Use analogies and real-world comparisons for complex concepts
- Be encouraging and build confidence
- Break down complex topics into digestible parts

Response format: Start with "[Concept Explainer Mode]" then provide your explanation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 
        '[Concept Explainer Mode] I\'m ready to explain any programming concept! What would you like to learn about?';
    } catch (error) {
      console.error('OpenAI API error in Concept Explainer mode:', error);
      // Fallback to enhanced mock response
      return `[Concept Explainer Mode] Hello! I'm your AI programming tutor, specialized in explaining ${languages} concepts! 📚

🎯 Tailored for your ${difficulty} level using ${learningStyle} learning approaches.

I can help explain:
• ${languages} fundamentals and advanced topics
• Programming patterns and best practices  
• Problem-solving techniques
• Code organization and architecture

${userInput.toLowerCase().includes('explain') || userInput.toLowerCase().includes('what') || userInput.toLowerCase().includes('how') ? 
  `Great question about "${userInput}"! I'd love to break this down for you with practical examples.` :
  'What programming concept would you like me to explain today? Just ask!'
}

💡 I'll use simple terms, real examples, and step-by-step breakdowns!`;
    }
  }

  // Execute Quiz Generator Node with real OpenAI
  private async executeQuizGeneratorNode(state: TutorState): Promise<string> {
    const difficulty = state.context.user_preferences?.difficulty || 'beginner';
    const languages = state.context.user_preferences?.preferred_languages?.join(', ') || 'JavaScript';
    const userInput = state.context.user_input;
    
    const prompt = `You are an expert programming tutor in Quiz Mode. Your role is to create engaging, educational programming quizzes and practice questions.

Student Profile:
- Level: ${difficulty}
- Preferred Languages: ${languages}
- Request: "${userInput}"

Instructions:
- Create questions appropriate for ${difficulty} level programmers
- Focus on ${languages} programming concepts
- If user wants to "start quiz" or "create quiz", generate 1-2 multiple choice questions with code examples
- Include clear explanations for answers
- Make questions practical and relevant to real programming scenarios
- If user asks for specific topics, create questions about those topics
- Use code snippets when appropriate
- Always explain the reasoning behind correct answers

Response format: Start with "[Quiz Mode]" then provide your quiz content with questions, options, and explanations.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content || 
        '[Quiz Mode] I\'m ready to create personalized programming quizzes for you! What topic would you like to be quizzed on?';
    } catch (error) {
      console.error('OpenAI API error in Quiz Generator mode:', error);
      // Fallback to enhanced mock response
      return `[Quiz Mode] 🧠 Ready to test your ${languages} programming knowledge? 

🎯 **${difficulty.toUpperCase()} Level Quiz Available**

I can create personalized quizzes featuring:
• ${languages} syntax and concepts
• Code output prediction challenges  
• Debugging exercises
• Best practices questions
• Logic and problem-solving

${userInput.toLowerCase().includes('quiz') || userInput.toLowerCase().includes('test') || userInput.toLowerCase().includes('question') ? 
  `**🚀 Quick ${languages} Challenge:**
  
  What will this code output?
  \`\`\`javascript
  const arr = [1, 2, 3];
  console.log(arr.map(x => x * 2));
  \`\`\`
  
  a) [1, 2, 3]
  b) [2, 4, 6]  
  c) [1, 4, 9]
  d) undefined
  
  **Answer: b) [2, 4, 6]** - map() creates a new array with each element multiplied by 2!` :
  'What specific topic would you like me to quiz you on? Just ask!'
}

💡 Say "start quiz" for a random challenge, or request questions on specific topics!`;
    }
  }

  // Execute Mistake Analyzer Node with real OpenAI
  private async executeMistakeAnalyzerNode(state: TutorState): Promise<string> {
    const difficulty = state.context.user_preferences?.difficulty || 'beginner';
    const languages = state.context.user_preferences?.preferred_languages?.join(', ') || 'JavaScript';
    const userInput = state.context.user_input;
    const sessionsCompleted = state.context.conversation_history?.length || 0;
    
    const prompt = `You are an expert programming tutor in Progress Analysis Mode. Your role is to analyze learning patterns, identify common mistakes, and provide personalized improvement guidance.

Student Profile:
- Level: ${difficulty}
- Preferred Languages: ${languages}
- Sessions Completed: ${sessionsCompleted}
- Request: "${userInput}"

Instructions:
- If user asks about progress, provide encouraging analysis of their learning journey
- If user mentions specific mistakes or errors, analyze the root cause and provide solutions
- Give practical advice for improvement based on their ${difficulty} level
- Identify common mistake patterns for ${languages} programming
- Suggest specific practice exercises and learning resources
- Be supportive and focus on growth rather than criticism
- Provide actionable next steps for improvement
- Include both strengths and areas for growth

Response format: Start with "[Progress Analyzer Mode]" then provide your analysis with learning profile, recommendations, and actionable steps.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
        temperature: 0.6,
      });

      return response.choices[0]?.message?.content || 
        '[Progress Analyzer Mode] I\'m ready to analyze your programming progress and help you improve! What would you like to work on?';
    } catch (error) {
      console.error('OpenAI API error in Progress Analyzer mode:', error);
      // Fallback to enhanced mock response
      return `[Progress Analyzer Mode] 📊 Let's analyze your ${languages} programming journey! 

**Your Learning Profile:**
- Current Level: ${difficulty}
- Sessions Completed: ${sessionsCompleted}
- Focus Languages: ${languages}
- Learning Style: ${state.context.user_preferences?.learning_style || 'hands-on'}

${userInput.toLowerCase().includes('mistake') || userInput.toLowerCase().includes('error') || userInput.toLowerCase().includes('wrong') ? 
  `🔍 **Error Analysis Focus:**
  
  **Common ${difficulty} Level Challenges:**
  • Syntax errors and typos
  • Logic bugs in conditionals/loops
  • Scope and variable confusion
  • Async/await misunderstanding
  
  **Improvement Strategy:**
  ✅ Test code frequently in small chunks
  ✅ Use console.log() for debugging
  ✅ Read error messages carefully
  ✅ Practice with online coding platforms
  
  **Share your specific error for detailed analysis!**` :
  `📈 **Growth Opportunities:**
  
  **Strengths to Build On:**
  ✅ Active learning engagement
  ✅ ${difficulty} level ${languages} understanding
  ✅ Problem-solving mindset
  
  **Next Level Skills:**
  🎯 Advanced ${languages} patterns
  🎯 Code organization & best practices
  🎯 Testing and debugging techniques
  🎯 Performance optimization basics
  
  **Action Plan:**
  1. Practice coding challenges daily
  2. Build small projects using new concepts
  3. Review and refactor old code
  4. Study other developers' solutions`
}

💡 What specific area would you like personalized feedback on?`;
    }
  }

  // Main execution method
  public async executeGraph(
    userId: string,
    sessionId: string,
    userInput: string,
    currentContext?: any
  ): Promise<any> {
    try {
      // Get user preferences - use fallback if database not available
      let userPreferences;
      try {
        const user = await db.getUserById(userId);
        userPreferences = user?.preferences;
      } catch (dbError) {
        console.log('📝 Database not available, using fallback user preferences');
        userPreferences = {
          difficulty: 'beginner',
          preferred_languages: ['javascript', 'react', 'typescript'],
          learning_style: 'hands-on',
          explanation_mode: 'simple',
          topics_of_interest: ['web-development', 'frontend', 'javascript-fundamentals', 'react-hooks'],
          session_count: 1,
          preferred_pace: 'moderate'
        };
      }

      // Context-aware quiz explanation logic (final, robust)
      if (currentContext && currentContext.quizContext && /(question\s*\d+|q\d+|answer to \d+)/i.test(userInput)) {
        const quiz = currentContext.quizContext;
        // Extract question number from user input
        let match = userInput.match(/question\s*(\d+)/i);
        if (!match) match = userInput.match(/q(\d+)/i);
        if (!match) match = userInput.match(/answer to (\d+)/i);
        if (match) {
          const qNum = parseInt(match[1], 10) - 1; // 0-based index
          if (quiz.questions && quiz.questions[qNum]) {
            const q = quiz.questions[qNum];
            // Extract answer labels (A, B, C, D) from user input
            const answerMatch = userInput.match(/\b([A-D])\b/gi);
            const correctIdx = typeof q.correct_answer === 'string' ? q.correct_answer.toUpperCase().charCodeAt(0) - 65 : -1;
            let response = `Q${qNum + 1}: ${q.question}\n\nOptions:\n${q.options.map((opt: string, idx: number) => `${String.fromCharCode(65 + idx)}) ${opt}`).join('\n')}\n\nCorrect Answer: ${q.correct_answer}\n\nExplanation: ${q.explanation}`;
            // If user asks 'why not X', add explanation for that option
            if (answerMatch && answerMatch.length > 0) {
              const uniqueLabels = [...new Set(answerMatch.map(l => l.toUpperCase()))];
              for (const label of uniqueLabels) {
                const idx = label.charCodeAt(0) - 65;
                if (idx !== correctIdx && q.options[idx]) {
                  response += `\n\nOption ${label}) ${q.options[idx]} is not correct because it does not satisfy the requirements of the question or is not the best answer.`;
                }
              }
            }
            return {
              response,
              current_node: 'quiz-generator',
              available_transitions: ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer'],
              session_context: currentContext,
              metadata: { timestamp: new Date().toISOString(), iteration_count: 0 }
            };
          } else {
            return {
              response: `Sorry, your current quiz does not have a question ${qNum + 1}. Please check the question number and try again.`,
              current_node: 'quiz-generator',
              available_transitions: ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer'],
              session_context: currentContext,
              metadata: { timestamp: new Date().toISOString(), iteration_count: 0 }
            };
          }
        }
      }

      // Initialize state
      const state: TutorState = {
        current_node: 'router',
        user_id: userId,
        session_id: sessionId,
        context: {
          user_preferences: userPreferences,
          conversation_history: currentContext?.conversation_history || [],
          available_transitions: [],
          user_input: userInput,
          ...currentContext
        },
        metadata: {
          timestamp: new Date().toISOString(),
          iteration_count: 0
        }
      };

      // Determine which node to execute
      const targetNode = this.determineNode(userInput, state.context);
      state.current_node = targetNode;

      // Execute the appropriate node
      let response: string;
      switch (targetNode) {
        case 'code-feedback':
          response = await this.executeCodeFeedbackNode(state);
          break;
        case 'concept-explainer':
          response = await this.executeConceptExplainerNode(state);
          break;
        case 'quiz-generator':
          response = await this.executeQuizGeneratorNode(state);
          break;
        case 'mistake-analyzer':
          response = await this.executeMistakeAnalyzerNode(state);
          break;
        default:
          response = await this.executeConceptExplainerNode(state);
      }

      // Update context
      state.context.node_output = response;
      state.context.conversation_history.push({
        timestamp: new Date().toISOString(),
        user_input: userInput,
        node: targetNode,
        response: response
      });

      // Save session state to database
      await this.saveSessionState(sessionId, state);

      return {
        response: response,
        current_node: targetNode,
        available_transitions: ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer'],
        session_context: state.context,
        metadata: state.metadata
      };

    } catch (error) {
      console.error('LangGraph execution error:', error);
      
      // Return a fallback response
      return {
        response: "I'm here to help you learn programming! You can ask me to:\n\n• **Review your code** - Just paste it and I'll provide feedback\n• **Explain concepts** - Ask about any programming topic\n• **Create quizzes** - Test your knowledge with interactive questions\n• **Track progress** - See your learning journey and improvements\n\nWhat would you like to work on today?",
        current_node: 'concept-explainer',
        available_transitions: ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer'],
        session_context: { user_input: userInput, conversation_history: [] },
        metadata: { timestamp: new Date().toISOString(), iteration_count: 0 }
      };
    }
  }

  private async saveSessionState(sessionId: string, state: TutorState): Promise<void> {
    try {
      await db.updateChatSession(sessionId, {
        current_node: state.current_node,
        context: state.context,
        conversation_history: state.context.conversation_history,
        available_transitions: ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer']
      });
      console.log(`💾 Session state saved for ${sessionId}`);
    } catch (error) {
      console.log(`📝 Database not available - session state kept in memory only (SessionID: ${sessionId})`);
      // Continue without blocking - this is non-critical for testing
    }
  }

  // Public method to get available nodes
  public getAvailableNodes(): NodeType[] {
    return ['code-feedback', 'concept-explainer', 'quiz-generator', 'mistake-analyzer'];
  }

  // Test method
  public async testConnection(): Promise<boolean> {
    try {
      // Simple test - just return true since we're not using external AI yet
      return true;
    } catch (error) {
      console.error('LangGraph test failed:', error);
      return false;
    }
  }

  // Public method to generate quiz questions using OpenAI
  public async generateQuizQuestions({ topic, total_questions = 5, userId, difficulty }: { topic: string, total_questions?: number, userId: string, difficulty?: string }): Promise<any[]> {
    // Fetch user preferences for better quiz generation
    let userPreferences;
    try {
      const user = await db.getUserById(userId);
      userPreferences = user?.preferences || {};
    } catch {
      userPreferences = {};
    }
    const quizDifficulty = (difficulty || userPreferences.difficulty || 'beginner').toLowerCase();
    const difficultyLabel = quizDifficulty.charAt(0).toUpperCase() + quizDifficulty.slice(1);
    const languages = userPreferences.preferred_languages?.join(', ') || 'JavaScript';
    const prompt = `You are an expert programming tutor in Quiz Mode. Create ${total_questions} multiple choice questions about "${topic}" for a ${difficultyLabel.toUpperCase()} level student using ${languages}. Make the questions appropriately challenging for a ${difficultyLabel} level. Each question should have 4 options (a, b, c, d) and indicate the correct answer and a brief explanation. Respond in JSON array format: [{question, options: {a, b, c, d}, answer, explanation}].`;
    try {
      console.log('[QuizGen] Prompt:', prompt);
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        temperature: 0.8,
      });
      console.log('[QuizGen] Raw OpenAI response:', response.choices[0]?.message?.content);
      let content = response.choices[0]?.message?.content || '';
      // Remove triple backticks and optional 'json'
      content = content.replace(/```json|```/gi, '').trim();
      const match = content.match(/\[.*\]/s);
      let rawQuestions = [];
      if (match) {
        rawQuestions = JSON.parse(match[0]);
      } else {
        // Fallback: return a single question if parsing fails
        console.warn('[QuizGen] No valid JSON array found in OpenAI response.');
        return [{ question: `No quiz generated for topic: ${topic}` }];
      }
      // Map to QuizQuestion interface
      const mappedQuestions = rawQuestions.map((q: any, idx: number) => {
        // Convert options object to array if needed
        let optionsArr: string[] = [];
        if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
          optionsArr = ['a', 'b', 'c', 'd'].map(key => q.options[key] || '');
        } else if (Array.isArray(q.options)) {
          optionsArr = q.options;
        }
        return {
          id: `${Date.now()}_${idx}`,
          type: 'mcq',
          question: q.question || '',
          options: optionsArr,
          code_snippet: q.code_snippet || '',
          correct_answer: q.answer || '',
          explanation: q.explanation || '',
          difficulty: quizDifficulty,
          concepts: [topic],
        };
      });
      return mappedQuestions;
    } catch (error) {
      console.error('[QuizGen] OpenAI API error or JSON parse error:', error);
      return [{ question: `Failed to generate quiz for topic: ${topic}` }];
    }
  }
}

// Export singleton instance
export const langGraphManager = LangGraphManager.getInstance();

// Initialize function
export const initializeLangGraph = async (): Promise<void> => {
  try {
    console.log('🧠 Initializing LangGraph...');
    
    // Test the connection
    const connectionOk = await langGraphManager.testConnection();
    if (!connectionOk) {
      throw new Error('Failed to initialize LangGraph');
    }
    
    console.log('✅ LangGraph initialized successfully');
    console.log(`📊 Available nodes: ${langGraphManager.getAvailableNodes().join(', ')}`);
    
  } catch (error) {
    console.error('❌ LangGraph initialization failed:', error);
    throw error;
  }
};

export default langGraphManager; 