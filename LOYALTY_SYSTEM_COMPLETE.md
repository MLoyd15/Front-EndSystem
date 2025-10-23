# Complete Loyalty System Documentation & Code

## API Endpoints

### 1. Get User Loyalty Information
**Endpoint:** `GET /api/loyalty/info`
**Authentication:** Required (Bearer token)
**Description:** Fetches the current user's loyalty information

**Response:**
```json
{
  "success": true,
  "data": {
    "loyaltyPoints": 150,
    "loyaltyTier": "Seedling",
    "loyaltyHistory": [
      {
        "date": "2024-01-15T10:30:00Z",
        "points": 25,
        "description": "Purchase order #12345"
      }
    ]
  }
}
```

### 2. Redeem Loyalty Reward
**Endpoint:** `POST /api/loyalty/redeem`
**Authentication:** Required (Bearer token)
**Description:** Redeems a loyalty reward using points

**Request Body:**
```json
{
  "rewardName": "5% Discount"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reward redeemed successfully",
  "data": {
    "remainingPoints": 125,
    "rewardDetails": {
      "name": "5% Discount",
      "cost": 25,
      "discountPercentage": 5
    }
  }
}
```

### 3. Get All Loyalty Rewards (Admin Only)
**Endpoint:** `GET /api/loyalty/rewards`
**Authentication:** Required (Admin Bearer token)
**Description:** Fetches all loyalty rewards with user data

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "reward_id",
      "userId": {
        "_id": "user_id",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "purchaseCount": 5,
      "totalSpent": 2500,
      "points": 150,
      "tier": "Seedling",
      "isEligible": true,
      "cardIssued": false,
      "cardType": null,
      "discountPercentage": 0,
      "isActive": true,
      "pointsHistory": []
    }
  ]
}
```

## Backend Code

### Loyalty Controller (`server/controlers/loyaltyController.js`)
```javascript
const User = require('../models/user');
const LoyaltyReward = require('../models/LoyaltyReward');
const loyaltyConfig = require('../config/loyaltyConfig');

// Get user loyalty information
const getLoyaltyInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('loyaltyPoints loyaltyTier loyaltyHistory');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        loyaltyPoints: user.loyaltyPoints || 0,
        loyaltyTier: user.loyaltyTier || 'Sprout',
        loyaltyHistory: user.loyaltyHistory || []
      }
    });
  } catch (error) {
    console.error('Error fetching loyalty info:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Redeem loyalty reward
const redeemReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rewardName } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find reward in config
    const reward = loyaltyConfig.rewards.find(r => r.name === rewardName);
    if (!reward) {
      return res.status(400).json({ success: false, message: 'Invalid reward' });
    }

    // Check if user has enough points
    if (user.loyaltyPoints < reward.cost) {
      return res.status(400).json({ success: false, message: 'Insufficient points' });
    }

    // Deduct points
    user.loyaltyPoints -= reward.cost;
    
    // Add to loyalty history
    user.loyaltyHistory.push({
      date: new Date(),
      points: -reward.cost,
      description: `Redeemed: ${rewardName}`
    });

    await user.save();

    res.json({
      success: true,
      message: 'Reward redeemed successfully',
      data: {
        remainingPoints: user.loyaltyPoints,
        rewardDetails: reward
      }
    });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get all loyalty rewards (Admin only)
const getUserLoyaltyRewards = async (req, res) => {
  try {
    const loyaltyRewards = await LoyaltyReward.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: loyaltyRewards
    });
  } catch (error) {
    console.error('Error fetching loyalty rewards:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getLoyaltyInfo,
  redeemReward,
  getUserLoyaltyRewards
};
```

### Loyalty Routes (`server/routes/loyalty.js`)
```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getLoyaltyInfo, redeemReward, getUserLoyaltyRewards } = require('../controlers/loyaltyController');

// Get user loyalty information
router.get('/info', authMiddleware, getLoyaltyInfo);

// Redeem loyalty reward
router.post('/redeem', authMiddleware, redeemReward);

// Get all loyalty rewards (Admin only)
router.get('/rewards', authMiddleware, getUserLoyaltyRewards);

module.exports = router;
```

### Loyalty Service (`server/services/loyaltyService.js`)
```javascript
const loyaltyConfig = require('../config/loyaltyConfig');

// Calculate loyalty points based on order
const calculatePoints = (orderProducts) => {
  let points = 0;
  
  orderProducts.forEach(item => {
    const basePoints = Math.floor(item.price * item.quantity);
    
    // Check for bonus categories
    if (loyaltyConfig.earningRules.bonusCategories.includes(item.category)) {
      points += basePoints * loyaltyConfig.earningRules.bonusMultiplier;
    } else {
      points += basePoints * loyaltyConfig.earningRules.baseRate;
    }
  });
  
  return points;
};

// Determine user tier based on points
const getTier = (points) => {
  const tiers = loyaltyConfig.tiers;
  
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].minPoints) {
      return tiers[i].name;
    }
  }
  
  return tiers[0].name; // Default to first tier
};

module.exports = {
  calculatePoints,
  getTier
};
```

### Loyalty Configuration (`server/config/loyaltyConfig.js`)
```javascript
const loyaltyConfig = {
  tiers: [
    { name: 'Sprout', minPoints: 0 },
    { name: 'Seedling', minPoints: 100 },
    { name: 'Cultivator', minPoints: 500 },
    { name: 'Bloom', minPoints: 1000 },
    { name: 'Harvester', minPoints: 2500 }
  ],
  
  earningRules: {
    baseRate: 1, // 1 point per peso
    bonusCategories: ['Fertilizer'],
    bonusMultiplier: 2 // Double points for fertilizer products
  },
  
  rewards: [
    { name: '5% Discount', cost: 25, discountPercentage: 5 },
    { name: 'Free Product Sample', cost: 50, description: 'Get a free sample of any product' },
    { name: '10% Discount', cost: 100, discountPercentage: 10 }
  ]
};

module.exports = loyaltyConfig;
```

## Data Models

### User Model (Loyalty Fields)
```javascript
// In server/models/user.js
const userSchema = new mongoose.Schema({
  // ... other fields
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  loyaltyTier: {
    type: String,
    default: 'Sprout'
  },
  loyaltyHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    points: Number,
    description: String
  }]
});
```

### LoyaltyReward Model
```javascript
// server/models/LoyaltyReward.js
const mongoose = require('mongoose');

const loyaltyRewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    default: 'Sprout'
  },
  isEligible: {
    type: Boolean,
    default: true
  },
  cardIssued: {
    type: Boolean,
    default: false
  },
  cardType: {
    type: String,
    default: null
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
    date: {
      type: Date,
      default: Date.now
    },
    points: Number,
    description: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('LoyaltyReward', loyaltyRewardSchema);
```

## Mobile Implementation Examples

### React Native Loyalty Service
```javascript
// services/LoyaltyService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

class LoyaltyService {
  async getLoyaltyInfo() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/loyalty/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch loyalty info');
      }
    } catch (error) {
      console.error('Error fetching loyalty info:', error);
      throw error;
    }
  }

  async redeemReward(rewardName) {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/loyalty/redeem`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rewardName }),
      });

      const data = await response.json();
      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Failed to redeem reward');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  getTierColor(tier) {
    const colors = {
      'Sprout': '#4CAF50',
      'Seedling': '#8BC34A',
      'Cultivator': '#FFC107',
      'Bloom': '#FF9800',
      'Harvester': '#FF5722'
    };
    return colors[tier] || '#4CAF50';
  }

  getNextTier(currentTier, currentPoints) {
    const tiers = [
      { name: 'Sprout', minPoints: 0 },
      { name: 'Seedling', minPoints: 100 },
      { name: 'Cultivator', minPoints: 500 },
      { name: 'Bloom', minPoints: 1000 },
      { name: 'Harvester', minPoints: 2500 }
    ];

    const currentIndex = tiers.findIndex(t => t.name === currentTier);
    if (currentIndex < tiers.length - 1) {
      const nextTier = tiers[currentIndex + 1];
      return {
        name: nextTier.name,
        pointsNeeded: nextTier.minPoints - currentPoints
      };
    }
    return null;
  }
}

export default new LoyaltyService();
```

### React Native Loyalty Component
```javascript
// components/LoyaltyScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import LoyaltyService from '../services/LoyaltyService';

const LoyaltyScreen = () => {
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const rewards = [
    { name: '5% Discount', cost: 25, discountPercentage: 5 },
    { name: 'Free Product Sample', cost: 50, description: 'Get a free sample of any product' },
    { name: '10% Discount', cost: 100, discountPercentage: 10 }
  ];

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      const data = await LoyaltyService.getLoyaltyInfo();
      setLoyaltyData(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load loyalty information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRedeemReward = async (rewardName) => {
    try {
      Alert.alert(
        'Confirm Redemption',
        `Are you sure you want to redeem ${rewardName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Redeem',
            onPress: async () => {
              const result = await LoyaltyService.redeemReward(rewardName);
              Alert.alert('Success', result.message);
              fetchLoyaltyData(); // Refresh data
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLoyaltyData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading loyalty information...</Text>
      </View>
    );
  }

  const nextTier = LoyaltyService.getNextTier(loyaltyData.loyaltyTier, loyaltyData.loyaltyPoints);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Loyalty Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.title}>Loyalty Status</Text>
        <View style={styles.tierContainer}>
          <Text style={[styles.tier, { color: LoyaltyService.getTierColor(loyaltyData.loyaltyTier) }]}>
            {loyaltyData.loyaltyTier}
          </Text>
          <Text style={styles.points}>{loyaltyData.loyaltyPoints} Points</Text>
        </View>
        
        {nextTier && (
          <Text style={styles.nextTier}>
            {nextTier.pointsNeeded} points to {nextTier.name}
          </Text>
        )}
      </View>

      {/* Available Rewards */}
      <View style={styles.rewardsSection}>
        <Text style={styles.sectionTitle}>Available Rewards</Text>
        {rewards.map((reward, index) => (
          <View key={index} style={styles.rewardCard}>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardName}>{reward.name}</Text>
              <Text style={styles.rewardCost}>{reward.cost} points</Text>
              {reward.description && (
                <Text style={styles.rewardDescription}>{reward.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.redeemButton,
                loyaltyData.loyaltyPoints < reward.cost && styles.disabledButton
              ]}
              onPress={() => handleRedeemReward(reward.name)}
              disabled={loyaltyData.loyaltyPoints < reward.cost}
            >
              <Text style={[
                styles.redeemButtonText,
                loyaltyData.loyaltyPoints < reward.cost && styles.disabledButtonText
              ]}>
                Redeem
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Points History */}
      {loyaltyData.loyaltyHistory && loyaltyData.loyaltyHistory.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Points History</Text>
          {loyaltyData.loyaltyHistory.slice(0, 5).map((entry, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDescription}>{entry.description}</Text>
              <Text style={[
                styles.historyPoints,
                entry.points > 0 ? styles.positivePoints : styles.negativePoints
              ]}>
                {entry.points > 0 ? '+' : ''}{entry.points}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tier: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  points: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  nextTier: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  rewardsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rewardCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rewardCost: {
    fontSize: 14,
    color: '#666',
  },
  rewardDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  redeemButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#888',
  },
  historySection: {
    margin: 16,
  },
  historyItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDescription: {
    flex: 1,
    fontSize: 14,
  },
  historyPoints: {
    fontSize: 14,
    fontWeight: '600',
  },
  positivePoints: {
    color: '#4CAF50',
  },
  negativePoints: {
    color: '#F44336',
  },
});

export default LoyaltyScreen;
```

## Important Implementation Notes

### Authentication
- All loyalty endpoints require authentication via Bearer token
- Store the token securely using AsyncStorage or Keychain
- Handle token expiration gracefully

### Error Handling
- Always wrap API calls in try-catch blocks
- Provide user-friendly error messages
- Handle network connectivity issues

### Reward Names
- Use exact reward names from the config when redeeming
- Available rewards: "5% Discount", "Free Product Sample", "10% Discount"

### Points Calculation
- Points are calculated automatically when orders are created
- Base rate: 1 point per peso spent
- Bonus: 2x points for "Fertilizer" category products

### Real-time Updates
- Refresh loyalty data after successful redemptions
- Consider implementing push notifications for point updates

### Offline Support
- Cache loyalty data locally for offline viewing
- Queue redemption requests when offline and sync when online

### Security
- Never store sensitive data in plain text
- Validate all inputs on both client and server side
- Use HTTPS for all API communications

This complete documentation includes all the backend code, API endpoints, data models, mobile implementation examples, and important notes for implementing the loyalty system across platforms.