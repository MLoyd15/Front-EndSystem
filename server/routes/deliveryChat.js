import express from 'express';
import {
  createDeliveryChat,
  getDeliveryChatMessages,
  sendDeliveryMessage,
  getDriverDeliveryChats,
  closeDeliveryChat,
  sendLocationUpdate
} from '../controlers/deliveryChatController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Driver routes for delivery chat
router.post('/create', createDeliveryChat);
router.get('/driver/chats', getDriverDeliveryChats);
router.get('/:chatId/messages', getDeliveryChatMessages);
router.post('/:chatId/message', sendDeliveryMessage);
router.post('/:chatId/location', sendLocationUpdate);
router.post('/:chatId/close', closeDeliveryChat);

export default router;