import mongoose from 'mongoose';

const deliveryMessageSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String, // Can be ObjectId (driver) or mobile app user identifier (customer)
    required: true
  },
  senderType: {
    type: String,
    enum: ['driver', 'customer'],
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'location', 'image', 'system'],
    default: 'text'
  },
  // For location messages
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  // For image messages
  imageUrl: String,
  // For system messages (delivery status updates, etc.)
  systemData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  readBy: [{
    userId: String,
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Indexes for efficient queries
deliveryMessageSchema.index({ chatId: 1, timestamp: 1 });
deliveryMessageSchema.index({ senderId: 1 });
deliveryMessageSchema.index({ senderType: 1 });

export default mongoose.model('DeliveryMessage', deliveryMessageSchema);