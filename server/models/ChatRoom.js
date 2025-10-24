import mongoose from 'mongoose';

const chatRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'closed'],
    default: 'waiting'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
chatRoomSchema.index({ userId: 1 });
chatRoomSchema.index({ adminId: 1 });
chatRoomSchema.index({ status: 1 });
chatRoomSchema.index({ createdAt: -1 });

export default mongoose.model('ChatRoom', chatRoomSchema);