import express from 'express'
import { login, logout, validateAccessKey } from '../controlers/AuthController.js'

const router = express.Router();

// Validate access key for owner portal access
router.post('/validate-access-key', validateAccessKey);

// Login endpoint without restrictions
router.post('/login', login);

// Logout endpoint
router.post('/logout', logout);

export default router;