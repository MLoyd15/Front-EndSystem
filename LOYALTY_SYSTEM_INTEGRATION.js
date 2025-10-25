/**
 * ========================================
 * COMPLETE LOYALTY SYSTEM INTEGRATION
 * ========================================
 * 
 * This file contains all the loyalty system code needed for cross-platform backend integration.
 * Copy the relevant sections to your project structure as needed.
 * 
 * Author: AI Assistant
 * Date: 2024
 * Version: 1.0
 */

// ========================================
// 1. LOYALTY CONFIGURATION
// ========================================
// File: server/config/loyaltyConfig.js

export const tiers = [
  { name: "Sprout", minPoints: 0 },
  { name: "Seedling", minPoints: 100 },
  { name: "Cultivator", minPoints: 500 },
  { name: "Bloom", minPoints: 1000 },
  { name: "Harvester", minPoints: 2000 }
];

export const earningRules = {
  perPeso: 1, // 1 point per $1 spent
  bonusCategories: {
    "Fertilizer": 2 // double points on Fertilizer products
  }
};

export const rewards = [
  { name: "5% Discount", cost: 100 },
  { name: "Free Product Sample", cost: 250 },
  { name: "10% Discount", cost: 500 }
];

// ========================================
// 2. LOYALTY SERVICE LAYER
// ========================================
// File: server/services/loyaltyService.js

import { tiers, earningRules } from "../config/loyaltyConfig.js";

export const calculatePoints = (order) => {
  let points = 0;

  order.products.forEach((item) => {
    const basePoints = item.price * item.quantity * earningRules.perPeso;

    // Bonus points for special categories
    if (item.productName && earningRules.bonusCategories[item.productName]) {
      points += basePoints * earningRules.bonusCategories[item.productName];
    } else {
      points += basePoints;
    }
  });

  return Math.floor(points);
};

export const getTier = (points) => {
  let tier = "Sprout";
  for (let t of tiers) {
    if (points >= t.minPoints) tier = t.name;
  }
  return tier;
};

// ========================================
// 3. DATABASE MODELS
// ========================================

// ========================================
// 3.1 USER MODEL (Loyalty Fields)
// ========================================
// File: server/models/user.js
// Add these fields to your existing User schema:

const userLoyaltyFields = {
  loyaltyPoints: { type: Number, default: 0 },
  loyaltyTier: { 
    type: String, 
    enum: ["Sprout", "Seedling", "Cultivator", "Bloom", "Harvester"], 
    default: "Sprout" 
  },
  loyaltyHistory: [{
    action: { type: String }, // "earned" | "redeemed"
    points: { type: Number },
    date: { type: Date, default: Date.now }
  }]
};

// Complete User Schema Example:
/*
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {type: String},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    address: {type: String},
    role: {type: String, enum:["admin", "superadmin","user"]},

    // Loyalty fields
    loyaltyPoints: { type: Number, default: 0 },
    loyaltyTier: { type: String, enum: ["Sprout", "Seedling", "Cultivator", "Bloom", "Harvester"], default: "Sprout" },
    loyaltyHistory: [{
      action: { type: String }, // "earned" | "redeemed"
      points: { type: Number },
      date: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model("User", userSchema);
export default User;
*/

// ========================================
// 3.2 LOYALTY REWARD MODEL
// ========================================
// File: server/models/LoyaltyReward.js

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
    collection: 'loyaltyrewards'
  }
);

export const LoyaltyReward = mongoose.model("LoyaltyReward", loyaltyRewardSchema);

// ========================================
// 4. LOYALTY CONTROLLER
// ========================================
// File: server/controllers/loyaltyController.js

import User from "../models/user.js";
import { rewards } from "../config/loyaltyConfig.js";
import LoyaltyReward from "../models/LoyaltyReward.js";

export const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("loyaltyPoints loyaltyTier loyaltyHistory");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching loyalty info" });
  }
};

export const redeemReward = async (req, res) => {
  try {
    const { rewardName } = req.body;
    const user = await User.findById(req.user.id);

    const reward = rewards.find(r => r.name === rewardName);
    if (!reward) return res.status(400).json({ message: "Invalid reward" });

    if (user.loyaltyPoints < reward.cost) {
      return res.status(400).json({ message: "Not enough points" });
    }

    user.loyaltyPoints -= reward.cost;
    user.loyaltyHistory.push({ action: "redeemed", points: reward.cost });

    await user.save();

    res.json({ message: `Reward redeemed: ${rewardName}`, loyaltyPoints: user.loyaltyPoints });
  } catch (err) {
    res.status(500).json({ message: "Error redeeming reward" });
  }
};

export const getUserLoyaltyRewards = async (req, res) => {
  try {
    const rewards = await LoyaltyReward.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, rewards });
  } catch (error) {
    console.error("❌ Error fetching loyalty rewards:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};

// Additional controller functions for comprehensive loyalty management
export const addLoyaltyPoints = async (req, res) => {
  try {
    const { userId, points, source, orderId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add points to user
    user.loyaltyPoints += points;
    user.loyaltyHistory.push({ 
      action: "earned", 
      points: points,
      date: new Date()
    });

    // Update tier based on new points
    const newTier = getTier(user.loyaltyPoints);
    user.loyaltyTier = newTier;

    await user.save();

    // Update or create loyalty reward record
    let loyaltyReward = await LoyaltyReward.findOne({ userId });
    if (!loyaltyReward) {
      loyaltyReward = new LoyaltyReward({ userId });
    }

    loyaltyReward.points = user.loyaltyPoints;
    loyaltyReward.tier = newTier;
    loyaltyReward.pointsHistory.push({
      points,
      source,
      orderId,
      createdAt: new Date()
    });

    await loyaltyReward.save();

    res.json({ 
      success: true, 
      message: "Points added successfully",
      loyaltyPoints: user.loyaltyPoints,
      tier: newTier
    });
  } catch (error) {
    console.error("❌ Error adding loyalty points:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};

export const getLoyaltyStats = async (req, res) => {
  try {
    const stats = await LoyaltyReward.aggregate([
      {
        $group: {
          _id: "$tier",
          count: { $sum: 1 },
          totalPoints: { $sum: "$points" },
          avgPoints: { $avg: "$points" }
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);

    const totalMembers = await LoyaltyReward.countDocuments();
    const activeMembers = await LoyaltyReward.countDocuments({ isActive: true });

    res.json({
      success: true,
      stats: {
        tierDistribution: stats,
        totalMembers,
        activeMembers
      }
    });
  } catch (error) {
    console.error("❌ Error fetching loyalty stats:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error",
      error: error.message 
    });
  }
};

// ========================================
// 5. API ROUTES
// ========================================
// File: server/routes/loyalty.js

import express from "express";
import { 
  getLoyaltyInfo, 
  redeemReward, 
  getUserLoyaltyRewards,
  addLoyaltyPoints,
  getLoyaltyStats
} from "../controllers/loyaltyController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// User endpoints
router.get("/", authMiddleware, getLoyaltyInfo);           // Get user loyalty info
router.post("/redeem", authMiddleware, redeemReward);      // Redeem rewards

// Admin endpoints
router.get("/rewards", authMiddleware, getUserLoyaltyRewards);  // Get all loyalty rewards
router.post("/add-points", authMiddleware, addLoyaltyPoints);   // Add points to user
router.get("/stats", authMiddleware, getLoyaltyStats);          // Get loyalty statistics

export default router;

// ========================================
// 6. INTEGRATION WITH ORDER SYSTEM
// ========================================
// Add this to your order controller when an order is completed:

/*
import { calculatePoints, getTier } from "../services/loyaltyService.js";

// In your order completion function:
const awardLoyaltyPoints = async (order) => {
  try {
    const points = calculatePoints(order);
    const user = await User.findById(order.userId);
    
    if (user) {
      user.loyaltyPoints += points;
      user.loyaltyTier = getTier(user.loyaltyPoints);
      user.loyaltyHistory.push({
        action: "earned",
        points: points,
        date: new Date()
      });
      
      await user.save();
      
      // Update loyalty reward record
      let loyaltyReward = await LoyaltyReward.findOne({ userId: order.userId });
      if (!loyaltyReward) {
        loyaltyReward = new LoyaltyReward({ userId: order.userId });
      }
      
      loyaltyReward.purchaseCount += 1;
      loyaltyReward.totalSpent += order.totalAmount;
      loyaltyReward.points = user.loyaltyPoints;
      loyaltyReward.tier = user.loyaltyTier;
      loyaltyReward.pointsHistory.push({
        points,
        source: "purchase",
        orderId: order._id,
        createdAt: new Date()
      });
      
      await loyaltyReward.save();
    }
  } catch (error) {
    console.error("Error awarding loyalty points:", error);
  }
};
*/

// ========================================
// 7. FRONTEND API CALLS
// ========================================
// Example API calls for frontend integration:

const loyaltyAPI = {
  // Get user loyalty information
  getLoyaltyInfo: async () => {
    const response = await fetch('/api/loyalty/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  // Redeem a reward
  redeemReward: async (rewardName) => {
    const response = await fetch('/api/loyalty/redeem', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rewardName })
    });
    return response.json();
  },

  // Get all loyalty rewards (admin)
  getAllRewards: async () => {
    const response = await fetch('/api/loyalty/rewards', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  // Get loyalty statistics (admin)
  getStats: async () => {
    const response = await fetch('/api/loyalty/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
};

// ========================================
// 8. REACT NATIVE COMPONENT EXAMPLE
// ========================================
// Example React Native component for loyalty screen:

/*
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';

const LoyaltyScreen = () => {
  const [loyaltyInfo, setLoyaltyInfo] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyInfo();
  }, []);

  const fetchLoyaltyInfo = async () => {
    try {
      const data = await loyaltyAPI.getLoyaltyInfo();
      setLoyaltyInfo(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching loyalty info:', error);
      setLoading(false);
    }
  };

  const handleRedeemReward = async (rewardName) => {
    try {
      const result = await loyaltyAPI.redeemReward(rewardName);
      if (result.message) {
        Alert.alert('Success', result.message);
        fetchLoyaltyInfo(); // Refresh data
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to redeem reward');
    }
  };

  const renderReward = ({ item }) => (
    <TouchableOpacity 
      style={styles.rewardItem}
      onPress={() => handleRedeemReward(item.name)}
      disabled={loyaltyInfo?.loyaltyPoints < item.cost}
    >
      <Text style={styles.rewardName}>{item.name}</Text>
      <Text style={styles.rewardCost}>{item.cost} points</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loyalty Program</Text>
        <Text style={styles.points}>Points: {loyaltyInfo?.loyaltyPoints || 0}</Text>
        <Text style={styles.tier}>Tier: {loyaltyInfo?.loyaltyTier || 'Sprout'}</Text>
      </View>
      
      <Text style={styles.sectionTitle}>Available Rewards</Text>
      <FlatList
        data={rewards}
        renderItem={renderReward}
        keyExtractor={(item) => item.name}
      />
    </View>
  );
};

const styles = {
  container: { flex: 1, padding: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 24, fontWeight: 'bold' },
  points: { fontSize: 18, color: '#4CAF50' },
  tier: { fontSize: 16, color: '#FF9800' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  rewardItem: { 
    padding: 15, 
    backgroundColor: '#f5f5f5', 
    marginBottom: 10, 
    borderRadius: 8 
  },
  rewardName: { fontSize: 16, fontWeight: 'bold' },
  rewardCost: { fontSize: 14, color: '#666' }
};

export default LoyaltyScreen;
*/

// ========================================
// 9. API ENDPOINTS SUMMARY
// ========================================
/*
API Endpoints:

GET    /api/loyalty/           - Get user loyalty info (points, tier, history)
POST   /api/loyalty/redeem     - Redeem reward with points
GET    /api/loyalty/rewards    - Get all loyalty rewards (admin)
POST   /api/loyalty/add-points - Add points to user (admin)
GET    /api/loyalty/stats      - Get loyalty statistics (admin)

Request/Response Examples:

1. GET /api/loyalty/
   Response: {
     loyaltyPoints: 150,
     loyaltyTier: "Seedling",
     loyaltyHistory: [...]
   }

2. POST /api/loyalty/redeem
   Body: { rewardName: "5% Discount" }
   Response: {
     message: "Reward redeemed: 5% Discount",
     loyaltyPoints: 50
   }

3. GET /api/loyalty/rewards
   Response: {
     success: true,
     rewards: [...]
   }
*/

// ========================================
// 10. INSTALLATION INSTRUCTIONS
// ========================================
/*
Installation Steps:

1. Copy loyaltyConfig.js to server/config/
2. Copy loyaltyService.js to server/services/
3. Add loyalty fields to your User model
4. Copy LoyaltyReward.js to server/models/
5. Copy loyaltyController.js to server/controllers/
6. Copy loyalty.js to server/routes/
7. Add route to your main server file:
   app.use('/api/loyalty', loyaltyRoutes);
8. Integrate point awarding in your order completion logic
9. Use the frontend API calls in your React Native app

Dependencies (add to package.json if not present):
- mongoose
- express
- jsonwebtoken (for auth middleware)
*/

// ========================================
// END OF LOYALTY SYSTEM INTEGRATION
// ========================================

console.log("🎯 Loyalty System Integration File Created Successfully!");
console.log("📋 This file contains all the code needed for loyalty system integration.");
console.log("🚀 Copy the relevant sections to your project structure as needed.");