import express from 'express';
import {
  createSupportChat,
  acceptSupportChat,
  getChatMessages,
  sendSupportMessage,
  getPendingSupportChats,
  getActiveChats,
  closeSupportChat
} from '../controlers/supportChatControllers.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes (require authentication)
router.post('/create', authenticateToken, createSupportChat);
router.get('/:roomId/messages', authenticateToken, getChatMessages);
router.post('/:roomId/message', authenticateToken, sendSupportMessage);
router.post('/:roomId/close', authenticateToken, closeSupportChat);

// Admin routes (require authentication)
router.get('/pending', authenticateToken, getPendingSupportChats);
router.get('/active', authenticateToken, getActiveChats);
router.post('/:roomId/accept', authenticateToken, acceptSupportChat);

export default router;