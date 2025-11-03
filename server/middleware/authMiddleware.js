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

    // ✅ FIXED: Extract ALL fields from JWT token
    // This is critical for activity logs which need name and email
    req.user = {
      _id: decoded._id || decoded.id,           // ✅ ADD _id
      id: decoded.id || decoded._id,            // Keep for compatibility
      name: decoded.name,                        // ✅ ADD name (REQUIRED)
      email: decoded.email,                      // ✅ ADD email (REQUIRED)
      role: decoded.role                         // Already had this
    };

    // ✅ CRITICAL: Validate all required fields exist
    if (!req.user._id || !req.user.name || !req.user.email || !req.user.role) {
      console.error('❌ Token missing required fields:', {
        has_id: !!req.user._id,
        has_name: !!req.user.name,
        has_email: !!req.user.email,
        has_role: !!req.user.role,
        decoded: decoded
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token format. Please logout and login again to get a new token." 
      });
    }

    // Optional: Verify user still exists and is active
    const account = await User.findById(req.user._id).select("_id active");

    if (!account || account.active === false) {
      return res.status(401).json({ 
        success: false, 
        message: "Account not found or inactive" 
      });
    }

    console.log(`✅ User authenticated: ${req.user.name} (${req.user.email}) - Role: ${req.user.role}`);

    next();
  } catch (e) {
    console.error('❌ Auth middleware error:', e.message);
    
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired. Please login again." 
      });
    }
    
    if (e.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token. Please login again." 
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: "Authentication failed" 
    });
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