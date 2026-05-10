import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

/**
 * requireRole('teacher', 'admin') - allows only teacher or admin
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(user.role))
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    next();
  };
}
