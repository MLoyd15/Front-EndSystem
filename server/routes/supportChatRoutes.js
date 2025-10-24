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
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// User routes (require authentication)
router.post('/create', authMiddleware, createSupportChat);
router.get('/:roomId/messages', authMiddleware, getChatMessages);
router.post('/:roomId/message', authMiddleware, sendSupportMessage);
router.post('/:roomId/close', authMiddleware, closeSupportChat);

// Admin routes (require authentication)
router.get('/pending', authMiddleware, getPendingSupportChats);
router.get('/active', authMiddleware, getActiveChats);
router.post('/:roomId/accept', authMiddleware, acceptSupportChat);

export default router;