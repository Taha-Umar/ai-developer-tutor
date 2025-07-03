declare class AITutorServer {
    private app;
    private server;
    private io;
    private port;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeSocketIO;
    private initializeErrorHandling;
    private initializeLangGraph;
    start(): void;
    private shutdown;
}
export default AITutorServer;
//# sourceMappingURL=index.d.ts.map