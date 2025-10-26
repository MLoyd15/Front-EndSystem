import DeliveryChat from '../models/DeliveryChat.js';
import DeliveryMessage from '../models/DeliveryMessage.js';
import Delivery from '../models/Delivery.js';
import User from '../models/user.js';
import { v4 as uuidv4 } from 'uuid';

// Create or get existing delivery chat
export const createDeliveryChat = async (req, res) => {
  try {
    const { deliveryId, customerId, customerName, customerPhone } = req.body;
    const driverId = req.user.id;

    // Verify the delivery exists and is assigned to this driver
    const delivery = await Delivery.findOne({
      _id: deliveryId,
      assignedDriver: driverId
    }).populate('order');

    if (!delivery) {
      return res.status(404).json({ 
        success: false, 
        message: 'Delivery not found or not assigned to you' 
      });
    }

    // Check if chat already exists for this delivery
    let deliveryChat = await DeliveryChat.findOne({ deliveryId });

    if (!deliveryChat) {
      // Create new delivery chat
      const chatId = `delivery_${deliveryId}_${uuidv4()}`;
      deliveryChat = new DeliveryChat({
        chatId,
        deliveryId,
        customerId: customerId || delivery.order?.user?._id || delivery.customer?.email || 'unknown',
        customerName: customerName || delivery.order?.user?.name || delivery.customer?.name || 'Customer',
        customerPhone: customerPhone || delivery.order?.user?.phone || delivery.customer?.phone || '',
        driverId,
        status: 'active'
      });
      await deliveryChat.save();

      // Send initial system message
      const systemMessage = new DeliveryMessage({
        chatId: deliveryChat.chatId,
        senderId: 'system',
        senderType: 'driver',
        senderName: 'System',
        message: `Chat started for delivery ${delivery._id.toString().slice(-6)}`,
        messageType: 'system',
        systemData: {
          type: 'chat_started',
          deliveryId: delivery._id
        }
      });
      await systemMessage.save();

      // Notify customer via socket if available
      const io = req.app.get('io');
      if (io) {
        io.to(`customer_${deliveryChat.customerId}`).emit('delivery_chat_started', {
          chatId: deliveryChat.chatId,
          deliveryId: delivery._id,
          driverName: req.user.name
        });
      }
    }

    res.json({
      success: true,
      chat: {
        chatId: deliveryChat.chatId,
        deliveryId: deliveryChat.deliveryId,
        customerName: deliveryChat.customerName,
        customerPhone: deliveryChat.customerPhone,
        status: deliveryChat.status,
        createdAt: deliveryChat.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating delivery chat:', error);
    res.status(500).json({ success: false, message: 'Failed to create delivery chat' });
  }
};

// Get delivery chat messages
export const getDeliveryChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this chat
    const deliveryChat = await DeliveryChat.findOne({ chatId });
    if (!deliveryChat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if user is the driver for this delivery
    if (deliveryChat.driverId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await DeliveryMessage.find({ chatId })
      .sort({ timestamp: 1 })
      .limit(100);

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg._id,
        message: msg.message,
        messageType: msg.messageType,
        senderType: msg.senderType,
        senderName: msg.senderName,
        location: msg.location,
        imageUrl: msg.imageUrl,
        systemData: msg.systemData,
        timestamp: msg.timestamp,
        readBy: msg.readBy
      }))
    });
  } catch (error) {
    console.error('Error getting delivery chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
};

// Send message in delivery chat
export const sendDeliveryMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, messageType = 'text', location, imageUrl } = req.body;
    const userId = req.user.id;

    // Verify user has access to this chat
    const deliveryChat = await DeliveryChat.findOne({ chatId });
    if (!deliveryChat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if user is the driver for this delivery
    if (deliveryChat.driverId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get driver info
    const driver = await User.findById(userId).select('name');

    // Create message
    const deliveryMessage = new DeliveryMessage({
      chatId,
      senderId: userId,
      senderType: 'driver',
      senderName: driver.name,
      message,
      messageType,
      location,
      imageUrl
    });
    await deliveryMessage.save();

    // Update chat last activity
    await DeliveryChat.findOneAndUpdate(
      { chatId },
      { lastActivity: new Date() }
    );

    // Emit message to customer via socket
    const io = req.app.get('io');
    if (io) {
      const messageData = {
        id: deliveryMessage._id,
        message: deliveryMessage.message,
        messageType: deliveryMessage.messageType,
        senderType: deliveryMessage.senderType,
        senderName: deliveryMessage.senderName,
        location: deliveryMessage.location,
        imageUrl: deliveryMessage.imageUrl,
        timestamp: deliveryMessage.timestamp
      };

      io.to(`customer_${deliveryChat.customerId}`).emit('new_delivery_message', messageData);
    }

    res.json({
      success: true,
      message: {
        id: deliveryMessage._id,
        message: deliveryMessage.message,
        messageType: deliveryMessage.messageType,
        senderType: deliveryMessage.senderType,
        senderName: deliveryMessage.senderName,
        location: deliveryMessage.location,
        imageUrl: deliveryMessage.imageUrl,
        timestamp: deliveryMessage.timestamp
      }
    });
  } catch (error) {
    console.error('Error sending delivery message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Get driver's active delivery chats
export const getDriverDeliveryChats = async (req, res) => {
  try {
    const driverId = req.user.id;

    const chats = await DeliveryChat.find({
      driverId,
      status: { $in: ['active', 'completed'] }
    })
    .populate({
      path: 'deliveryId',
      select: 'order status deliveryAddress pickupLocation',
      populate: {
        path: 'order',
        select: '_id totalAmount'
      }
    })
    .sort({ lastActivity: -1 })
    .limit(20);

    // Get last message for each chat
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await DeliveryMessage.findOne({ chatId: chat.chatId })
          .sort({ timestamp: -1 })
          .limit(1);

        return {
          chatId: chat.chatId,
          deliveryId: chat.deliveryId._id,
          customerName: chat.customerName,
          customerPhone: chat.customerPhone,
          status: chat.status,
          lastActivity: chat.lastActivity,
          delivery: {
            status: chat.deliveryId.status,
            deliveryAddress: chat.deliveryId.deliveryAddress,
            pickupLocation: chat.deliveryId.pickupLocation,
            orderId: chat.deliveryId.order?._id
          },
          lastMessage: lastMessage ? {
            message: lastMessage.message,
            senderType: lastMessage.senderType,
            timestamp: lastMessage.timestamp
          } : null
        };
      })
    );

    res.json({
      success: true,
      chats: chatsWithLastMessage
    });
  } catch (error) {
    console.error('Error getting driver delivery chats:', error);
    res.status(500).json({ success: false, message: 'Failed to get chats' });
  }
};

// Close delivery chat
export const closeDeliveryChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this chat
    const deliveryChat = await DeliveryChat.findOne({ chatId });
    if (!deliveryChat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if user is the driver for this delivery
    if (deliveryChat.driverId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update chat status
    await DeliveryChat.findOneAndUpdate(
      { chatId },
      { 
        status: 'closed',
        completedAt: new Date()
      }
    );

    // Send system message
    const systemMessage = new DeliveryMessage({
      chatId,
      senderId: 'system',
      senderType: 'driver',
      senderName: 'System',
      message: 'Chat has been closed by the driver',
      messageType: 'system',
      systemData: {
        type: 'chat_closed',
        closedBy: 'driver'
      }
    });
    await systemMessage.save();

    // Notify customer via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${deliveryChat.customerId}`).emit('delivery_chat_closed', {
        chatId,
        closedBy: 'driver'
      });
    }

    res.json({
      success: true,
      message: 'Chat closed successfully'
    });
  } catch (error) {
    console.error('Error closing delivery chat:', error);
    res.status(500).json({ success: false, message: 'Failed to close chat' });
  }
};

// Send location update to customer
export const sendLocationUpdate = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { latitude, longitude, address } = req.body;
    const userId = req.user.id;

    // Verify user has access to this chat
    const deliveryChat = await DeliveryChat.findOne({ chatId });
    if (!deliveryChat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Check if user is the driver for this delivery
    if (deliveryChat.driverId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get driver info
    const driver = await User.findById(userId).select('name');

    // Create location message
    const locationMessage = new DeliveryMessage({
      chatId,
      senderId: userId,
      senderType: 'driver',
      senderName: driver.name,
      message: `Driver location: ${address || 'Current location'}`,
      messageType: 'location',
      location: {
        latitude,
        longitude,
        address
      }
    });
    await locationMessage.save();

    // Update chat last activity
    await DeliveryChat.findOneAndUpdate(
      { chatId },
      { lastActivity: new Date() }
    );

    // Emit location to customer via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`customer_${deliveryChat.customerId}`).emit('driver_location_update', {
        chatId,
        location: {
          latitude,
          longitude,
          address
        },
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Location sent successfully'
    });
  } catch (error) {
    console.error('Error sending location update:', error);
    res.status(500).json({ success: false, message: 'Failed to send location' });
  }
};