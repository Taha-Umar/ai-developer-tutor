interface Config {
    port: number;
    nodeEnv: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceKey: string;
    openaiApiKey: string;
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    jwtRefreshExpiresIn: string;
    frontendUrl: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    langGraphDebug: boolean;
    langGraphCheckpointSaver: string;
}
export declare const config: Config;
export type { Config };
export default config;
//# sourceMappingURL=environment.d.ts.map