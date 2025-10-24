import ChatRoom from '../models/ChatRoom.js';
import SupportMessage from '../models/SupportMessage.js';
import User from '../models/user.js';
import { v4 as uuidv4 } from 'uuid';

// Create or get existing support chat room for user
export const createSupportChat = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user already has an active chat room
    let chatRoom = await ChatRoom.findOne({
      userId,
      status: { $in: ['waiting', 'active'] }
    }).populate('adminId', 'name email role');

    if (!chatRoom) {
      // Create new chat room
      const roomId = `support_${userId}_${uuidv4()}`;
      chatRoom = new ChatRoom({
        roomId,
        userId,
        status: 'waiting'
      });
      await chatRoom.save();
      
      // Notify available admins about new support request
      const io = req.app.get('io');
      io.to('admin_room').emit('new_support_request', {
        roomId: chatRoom.roomId,
        userId,
        createdAt: chatRoom.createdAt
      });
    }

    res.json({
      success: true,
      chatRoom: {
        roomId: chatRoom.roomId,
        status: chatRoom.status,
        admin: chatRoom.adminId,
        createdAt: chatRoom.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating support chat:', error);
    res.status(500).json({ success: false, message: 'Failed to create support chat' });
  }
};

// Admin accepts a support chat
export const acceptSupportChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const adminId = req.user.id;
    
    // Verify admin role
    const admin = await User.findById(adminId);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const chatRoom = await ChatRoom.findOneAndUpdate(
      { roomId, status: 'waiting' },
      { 
        adminId,
        status: 'active',
        lastActivity: new Date()
      },
      { new: true }
    ).populate('userId', 'name email')
     .populate('adminId', 'name email role');

    if (!chatRoom) {
      return res.status(404).json({ success: false, message: 'Chat room not found or already assigned' });
    }

    // Notify user that admin joined
    const io = req.app.get('io');
    io.to(`user_${chatRoom.userId._id}`).emit('admin_joined', {
      roomId: chatRoom.roomId,
      admin: {
        id: chatRoom.adminId._id,
        name: chatRoom.adminId.name,
        role: chatRoom.adminId.role
      }
    });

    // Notify other admins that this chat was taken
    io.to('admin_room').emit('support_chat_taken', { roomId });

    res.json({
      success: true,
      chatRoom: {
        roomId: chatRoom.roomId,
        status: chatRoom.status,
        user: chatRoom.userId,
        admin: chatRoom.adminId
      }
    });
  } catch (error) {
    console.error('Error accepting support chat:', error);
    res.status(500).json({ success: false, message: 'Failed to accept support chat' });
  }
};

// Get chat messages
export const getChatMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    
    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      roomId,
      $or: [
        { userId },
        { adminId: userId }
      ]
    });

    if (!chatRoom) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await SupportMessage.find({ roomId })
      .populate('senderId', 'name role')
      .sort({ timestamp: 1 })
      .limit(100);

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg._id,
        message: msg.message,
        senderType: msg.senderType,
        sender: {
          id: msg.senderId._id,
          name: msg.senderId.name,
          role: msg.senderId.role
        },
        timestamp: msg.timestamp
      }))
    });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages' });
  }
};

// Send message in support chat
export const sendSupportMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      roomId,
      $or: [
        { userId },
        { adminId: userId }
      ]
    });

    if (!chatRoom) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Determine sender type
    const user = await User.findById(userId);
    const senderType = ['admin', 'superadmin'].includes(user.role) ? 'admin' : 'user';

    // Create message
    const supportMessage = new SupportMessage({
      roomId,
      senderId: userId,
      senderType,
      message
    });
    await supportMessage.save();
    await supportMessage.populate('senderId', 'name role');

    // Debug logging
    console.log('Populated sender data:', JSON.stringify(supportMessage.senderId, null, 2));
    console.log('Sender name direct access:', supportMessage.senderId.name);
    console.log('Sender object keys:', Object.keys(supportMessage.senderId.toObject ? supportMessage.senderId.toObject() : supportMessage.senderId));

    // Update chat room last activity
    await ChatRoom.findOneAndUpdate(
      { roomId },
      { lastActivity: new Date() }
    );

    // Emit message to chat room
    const io = req.app.get('io');
    const messageData = {
      id: supportMessage._id,
      message: supportMessage.message,
      senderType: supportMessage.senderType,
      sender: {
        id: supportMessage.senderId._id,
        name: supportMessage.senderId.name,
        role: supportMessage.senderId.role
      },
      timestamp: supportMessage.timestamp
    };

    io.to(`support_${roomId}`).emit('new_support_message', messageData);

    res.json({
      success: true,
      message: messageData
    });
  } catch (error) {
    console.error('Error sending support message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Get pending support chats (for admins)
export const getPendingSupportChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify admin role
    const admin = await User.findById(userId);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const pendingChats = await ChatRoom.find({ status: 'waiting' })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      chats: pendingChats.map(chat => ({
        roomId: chat.roomId,
        user: {
          id: chat.userId._id,
          name: chat.userId.name,
          email: chat.userId.email
        },
        createdAt: chat.createdAt
      }))
    });
  } catch (error) {
    console.error('Error getting pending support chats:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending chats' });
  }
};

export const getActiveChats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Verify admin role
    const admin = await User.findById(userId);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const activeChats = await ChatRoom.find({ 
      adminId: userId,
      status: 'active'
    })
      .populate('userId', 'firstName lastName email')
      .sort({ lastActivity: -1 });

    res.json({
      success: true,
      chats: activeChats.map(chat => ({
        roomId: chat.roomId,
        user: {
          id: chat.userId._id,
          name: `${chat.userId.firstName} ${chat.userId.lastName}`,
          email: chat.userId.email
        },
        lastActivity: chat.lastActivity
      }))
    });
  } catch (error) {
    console.error('Error getting active chats:', error);
    res.status(500).json({ success: false, message: 'Failed to get active chats' });
  }
};

// Close support chat
export const closeSupportChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    
    // Verify user has access to this chat room
    const chatRoom = await ChatRoom.findOne({
      roomId,
      $or: [
        { userId },
        { adminId: userId }
      ]
    });

    if (!chatRoom) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Update chat room status
    await ChatRoom.findOneAndUpdate(
      { roomId },
      { 
        status: 'closed',
        closedAt: new Date()
      }
    );

    // Notify participants
    const io = req.app.get('io');
    io.to(`support_${roomId}`).emit('support_chat_closed', { roomId });

    res.json({ success: true, message: 'Chat closed successfully' });
  } catch (error) {
    console.error('Error closing support chat:', error);
    res.status(500).json({ success: false, message: 'Failed to close chat' });
  }
};