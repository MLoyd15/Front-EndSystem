import rateLimit from 'express-rate-limit';

// Store for tracking login attempts and active sessions
const loginAttempts = new Map();
const activeSessions = new Map();

// Rate limiting configuration for login attempts
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // Limit each IP to 1 login attempt per windowMs
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
    retryAfter: "15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator to handle IPv6 properly
  // Skip successful requests (only count failed attempts)
  skipSuccessfulRequests: true,
  // Skip failed requests that aren't authentication failures
  skipFailedRequests: false,
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.log(`🚫 Rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Login attempt limit exceeded. Only 1 login attempt allowed per 15 minutes.",
      retryAfter: "15 minutes",
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware to track and enforce single owner session
export const ownerSessionMiddleware = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    
    // Only apply to superadmin/owner logins
    if (role === 'superadmin' || (email && email.includes('superadmin'))) {
      const sessionKey = 'owner_session';
      const currentTime = Date.now();
      
      // Check if there's an active owner session
      const activeSession = activeSessions.get(sessionKey);
      
      if (activeSession) {
        const sessionAge = currentTime - activeSession.loginTime;
        const sessionTimeout = 60 * 60 * 1000; // 1 hour timeout
        
        // If session is still active (within timeout)
        if (sessionAge < sessionTimeout) {
          console.log(`🚫 Owner session already active. Blocking new login attempt.`);
          return res.status(423).json({
            success: false,
            message: "Owner session already active. Only one owner login allowed at a time.",
            activeSession: {
              loginTime: new Date(activeSession.loginTime).toISOString(),
              ip: activeSession.ip,
              sessionAge: Math.floor(sessionAge / 1000 / 60) + " minutes"
            }
          });
        } else {
          // Session expired, remove it
          activeSessions.delete(sessionKey);
          console.log(`⏰ Expired owner session removed`);
        }
      }
      
      // Store session info for successful login (will be set in auth controller)
      req.ownerSessionData = {
        sessionKey,
        ip: req.ip || req.connection.remoteAddress,
        loginTime: currentTime
      };
    }
    
    next();
  } catch (error) {
    console.error('Owner session middleware error:', error);
    return res.status(500).json({
      success: false,
      message: "Session validation error"
    });
  }
};

// Function to register successful owner login
export const registerOwnerSession = (sessionData) => {
  if (sessionData) {
    activeSessions.set(sessionData.sessionKey, {
      ip: sessionData.ip,
      loginTime: sessionData.loginTime
    });
    console.log(`✅ Owner session registered for IP: ${sessionData.ip}`);
  }
};

// Function to clear owner session (for logout)
export const clearOwnerSession = () => {
  activeSessions.delete('owner_session');
  console.log(`🔓 Owner session cleared`);
};

// Function to get active sessions info (for monitoring)
export const getActiveSessions = () => {
  return Array.from(activeSessions.entries()).map(([key, data]) => ({
    sessionKey: key,
    ip: data.ip,
    loginTime: new Date(data.loginTime).toISOString(),
    duration: Math.floor((Date.now() - data.loginTime) / 1000 / 60) + " minutes"
  }));
};

// Cleanup expired sessions periodically
setInterval(() => {
  const currentTime = Date.now();
  const sessionTimeout = 60 * 60 * 1000; // 1 hour
  
  for (const [key, session] of activeSessions.entries()) {
    if (currentTime - session.loginTime > sessionTimeout) {
      activeSessions.delete(key);
      console.log(`🧹 Cleaned up expired session: ${key}`);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes