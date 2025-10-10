import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],
    totalAmount: { type: Number, required: true },
    
    // ✅ NEW: Delivery-related fields
    deliveryType: { 
      type: String, 
      enum: ["pickup", "third-party", "in-house"], 
      default: "pickup" 
    },
    deliveryAddress: String,              // Customer's delivery address
    deliveryFee: { type: Number, default: 0 },  // Delivery cost
    totalWeightKg: Number,                // Total weight for delivery calculation
    
    // Customer contact (needed for Lalamove)
    customerContact: {
      name: String,
      phone: String,
      email: String
    },
    
    // Delivery coordinates (for Lalamove)
    deliveryCoordinates: {
      lat: Number,
      lng: Number
    },
    
    // Order status
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "preparing", "ready", "out-for-delivery", "delivered", "cancelled"], 
      default: "pending" 
    },
    
    // Special instructions
    notes: String,
    
    // Link to delivery record
    delivery: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery" }
  },
  { timestamps: true }
);

// Index for faster queries
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ user: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;