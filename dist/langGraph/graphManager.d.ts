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
export type NodeType = 'code-feedback' | 'concept-explainer' | 'quiz-generator' | 'mistake-analyzer' | 'router';
declare class LangGraphManager {
    private static instance;
    private constructor();
    static getInstance(): LangGraphManager;
    private determineNode;
    private executeCodeFeedbackNode;
    private executeConceptExplainerNode;
    private executeQuizGeneratorNode;
    private executeMistakeAnalyzerNode;
    executeGraph(userId: string, sessionId: string, userInput: string, currentContext?: any): Promise<any>;
    private saveSessionState;
    getAvailableNodes(): NodeType[];
    testConnection(): Promise<boolean>;
}
export declare const langGraphManager: LangGraphManager;
export declare const initializeLangGraph: () => Promise<void>;
export default langGraphManager;
//# sourceMappingURL=graphManager.d.ts.map