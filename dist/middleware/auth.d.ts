import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        username: string;
        email: string;
        preferences?: any;
    };
}
export declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuthMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateToken: (user: {
    id: string;
    username: string;
    email: string;
}) => string;
export declare const generateRefreshToken: (user: {
    id: string;
}) => string;
export declare const verifyRefreshToken: (token: string) => {
    userId: string;
} | null;
export default authMiddleware;
//# sourceMappingURL=auth.d.ts.map