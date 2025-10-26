import express from 'express'
import { login, logout, validateAccessKey } from '../controlers/AuthController.js'
import { loginRateLimit, ownerSessionMiddleware } from '../middleware/rateLimitMiddleware.js'

const router = express.Router();

// Validate access key for owner portal access
router.post('/validate-access-key', validateAccessKey);

// Apply rate limiting and session management to login endpoint
router.post('/login', 
    loginRateLimit,           // Rate limit: 1 attempt per 15 minutes per IP
    ownerSessionMiddleware,   // Owner session management: 1 active session only
    login                     // Login controller
);

// Logout endpoint to clear sessions
router.post('/logout', logout);

export default router;