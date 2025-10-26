import mongoose from 'mongoose';

const deliveryChatSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true
  },
  deliveryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery',
    required: true
  },
  customerId: {
    type: String, // Can be ObjectId or mobile app user identifier
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    default: ''
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'closed'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Indexes for efficient queries
deliveryChatSchema.index({ deliveryId: 1 });
deliveryChatSchema.index({ driverId: 1 });
deliveryChatSchema.index({ customerId: 1 });
deliveryChatSchema.index({ status: 1 });
deliveryChatSchema.index({ createdAt: -1 });

export default mongoose.model('DeliveryChat', deliveryChatSchema);