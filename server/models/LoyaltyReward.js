import mongoose from "mongoose";

const loyaltyRewardSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    purchaseCount: { 
      type: Number, 
      default: 0 
    },
    totalSpent: { 
      type: Number, 
      default: 0 
    },
    points: { 
      type: Number, 
      default: 0 
    },
    tier: { 
      type: String, 
      default: ""
    },
    isEligible: { 
      type: Boolean, 
      default: false 
    },
    cardIssued: { 
      type: Boolean, 
      default: false 
    },
    cardType: { 
      type: String, 
      default: "bronze"
    },
    discountPercentage: { 
      type: Number, 
      default: 0 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    pointsHistory: [{
      points: Number,
      source: String,
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
      createdAt: { type: Date, default: Date.now },
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
    }]
  },
  { 
    timestamps: true,
    collection: 'loyaltyrewards' // ✅ Use your existing collection name
  }
);

export default mongoose.model("LoyaltyReward", loyaltyRewardSchema);