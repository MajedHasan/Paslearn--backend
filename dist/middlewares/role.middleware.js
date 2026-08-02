"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
/**
 * requireRole('teacher', 'admin') - allows only teacher or admin
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user)
            return res.status(401).json({ message: "Not authenticated" });
        if (!roles.includes(user.role))
            return res.status(403).json({ message: "Forbidden: insufficient role" });
        next();
    };
}
