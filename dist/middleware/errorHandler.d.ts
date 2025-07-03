import { Request, Response, NextFunction } from 'express';
export interface APIError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}
export declare class ValidationError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message: string, details?: any | undefined);
}
export declare class AuthenticationError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class AuthorizationError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class RateLimitError extends Error {
    statusCode: number;
    code: string;
    constructor(message?: string);
}
export declare class DatabaseError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message?: string, details?: any | undefined);
}
export declare class OpenAIError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message?: string, details?: any | undefined);
}
export declare class LangGraphError extends Error {
    details?: any | undefined;
    statusCode: number;
    code: string;
    constructor(message?: string, details?: any | undefined);
}
export declare const errorHandler: (error: APIError, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export default errorHandler;
//# sourceMappingURL=errorHandler.d.ts.map