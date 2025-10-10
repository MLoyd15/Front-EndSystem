import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    type: { type: String, enum: ["pickup", "third-party", "in-house"], required: true },
    status: { type: String, enum: ["pending", "assigned", "in-transit", "completed", "cancelled"], default: "pending" },
    
    // Address and Location
    deliveryAddress: String,
    pickupLocation: String,
    scheduledDate: Date,
    
    // Coordinates (for Lalamove and mapping)
    pickupCoordinates: {
      lat: Number,
      lng: Number
    },
    deliveryCoordinates: {
      lat: Number,
      lng: Number
    },
    
    // Third-party provider info
    thirdPartyProvider: String, // "Lalamove", "Grab", "J&T", etc.
    
    // Lalamove-specific fields
    lalamove: {
      quotationId: String,           // From quotation API
      orderId: String,               // From order creation API
      shareLink: String,             // Tracking link for customer
      priceBreakdown: {
        total: Number,
        currency: { type: String, default: "PHP" },
        base: Number,
        extraMileage: Number,
        surcharge: Number
      },
      serviceType: String,           // MOTORCYCLE, CAR, VAN, TRUCK
      estimatedTime: String,         // e.g., "30-45 mins"
      driver: {
        name: String,
        phone: String,
        plateNumber: String,
        photo: String,
        location: {
          lat: Number,
          lng: Number,
          lastUpdated: Date
        }
      },
      status: String,                // Lalamove's internal status
      trackingUrl: String,           // Real-time tracking URL
      cancelReason: String,          // If cancelled
      completedAt: Date,             // When driver marked as delivered
      proofOfDelivery: {             // POD from Lalamove
        signature: String,           // Image URL
        photo: String,               // Image URL
        note: String
      }
    },
    
    // In-house delivery fields
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    
    // Additional tracking
    deliveredAt: Date,               // Actual delivery timestamp
    estimatedDeliveryTime: Date,     // ETA
    deliveryFee: Number,             // Cost of delivery
    notes: String,                   // Special instructions
    
    // Customer contact (for third-party)
    customer: {
      name: String,
      phone: String,
      email: String
    }
  },
  { timestamps: true }
);

// Index for faster queries
deliverySchema.index({ status: 1, type: 1 });
deliverySchema.index({ 'lalamove.orderId': 1 });
deliverySchema.index({ assignedDriver: 1 });

export default mongoose.model("Delivery", deliverySchema);