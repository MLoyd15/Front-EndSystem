import jwt from "jsonwebtoken";
import User from "../models/user.js";      // unified user model for all roles

export default async function authMiddleware(req, res, next) {
  try {
    const h = req.headers.authorization || "";
    if (!h.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token" });
    }

    const token = h.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");

    // Use User model for all roles including drivers
    const account = await User.findById(decoded.id).select("_id role active");

    if (!account || account.active === false) {
      return res.status(401).json({ success: false, message: "Account not found or inactive" });
    }

    req.user = { id: String(account._id), role: decoded.role };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// Optional helper to protect admin-only endpoints
export function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
}
