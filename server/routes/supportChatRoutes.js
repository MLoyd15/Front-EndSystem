import express from 'express';
import {
  createSupportChat,
  acceptSupportChat,
  getChatMessages,
  sendSupportMessage,
  getPendingSupportChats,
  getActiveChats,
  closeSupportChat
} from '../controllers/supportChatController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User routes
router.post('/create', createSupportChat);
router.get('/:roomId/messages', getChatMessages);
router.post('/:roomId/message', sendSupportMessage);
router.post('/:roomId/close', closeSupportChat);

// Admin routes
router.get('/pending', getPendingSupportChats);
router.get('/active', getActiveChats);
router.post('/:roomId/accept', acceptSupportChat);

export default router;