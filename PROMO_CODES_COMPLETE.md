# PROMO CODES SYSTEM - COMPLETE DOCUMENTATION

## API ENDPOINTS

### 1. Apply Promo Code (Customer)
**Endpoint:** `POST /api/promo/apply`
**Authentication:** Optional (can be public or protected)
**Purpose:** Validate promo code and calculate discount

**Request Body:**
```json
{
  "code": "SAVE20",
  "subtotal": 1000
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "type": "Percentage",
  "discount": 200,
  "promo": {
    "_id": "64f...",
    "code": "SAVE20",
    "name": "20% Off Sale",
    "type": "Percentage",
    "value": 20,
    "minSpend": 500,
    "maxDiscount": 300,
    "used": 15,
    "limit": 100,
    "status": "Active",
    "startsAt": "2024-01-01T00:00:00.000Z",
    "endsAt": "2024-12-31T23:59:59.000Z"
  }
}
```

**Free Shipping Response:**
```json
{
  "ok": true,
  "type": "Free Shipping",
  "discount": 0,
  "freeShipping": true,
  "promo": { /* promo object */ }
}
```

**Error Responses:**
- `404`: "Invalid code"
- `400`: "Promo is paused"
- `400`: "Promo not started"
- `400`: "Promo expired"
- `400`: "Promo usage limit reached"
- `400`: "Minimum spend is ₱{amount}"

### 2. List Promos (Admin Only)
**Endpoint:** `GET /api/promo`
**Authentication:** Required (authMiddleware)
**Purpose:** Get all promo codes for admin management

**Response:**
```json
[
  {
    "_id": "64f...",
    "code": "SAVE20",
    "name": "20% Off Sale",
    "type": "Percentage",
    "value": 20,
    "minSpend": 500,
    "maxDiscount": 300,
    "used": 15,
    "limit": 100,
    "status": "Active",
    "startsAt": "2024-01-01T00:00:00.000Z",
    "endsAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## BACKEND CODE

### Promo Controller (`server/controlers/promoController.js`)

```javascript
import Promotion from "../models/Promotion.js";
import mongoose from "mongoose";

// Apply promo code and calculate discount
export const applyPromo = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const now = new Date();
    
    const promo = await Promotion.findOne({ code: String(code).toUpperCase().trim() });
    if (!promo) return res.status(404).json({ message: "Invalid code" });
    
    // Validation checks
    if (promo.status === "Paused") return res.status(400).json({ message: "Promo is paused" });
    if (promo.startsAt && now < promo.startsAt) return res.status(400).json({ message: "Promo not started" });
    if (promo.endsAt && now > promo.endsAt) return res.status(400).json({ message: "Promo expired" });
    if (promo.limit > 0 && promo.used >= promo.limit) return res.status(400).json({ message: "Promo usage limit reached" });
    if (subtotal < (promo.minSpend || 0)) return res.status(400).json({ message: `Minimum spend is ₱${promo.minSpend}` });
    
    // Calculate discount
    let discount = 0;
    if (promo.type === "Percentage") {
      discount = (Number(promo.value || 0) / 100) * subtotal;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else if (promo.type === "Fixed Amount") {
      discount = Math.min(Number(promo.value || 0), subtotal);
    } else if (promo.type === "Free Shipping") {
      // Free shipping doesn't reduce subtotal but removes delivery fee
      return res.json({ ok: true, type: promo.type, discount: 0, freeShipping: true, promo });
    }
    
    res.json({ ok: true, type: promo.type, discount: Math.floor(discount), promo });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Redeem promo code during order creation (called within transaction)
export const redeemPromoOnOrder = async (session, promoId) => {
  return await Promotion.updateOne(
    { _id: promoId, $or: [{ limit: 0 }, { used: { $lt: "$limit" } }] },
    { $inc: { used: 1 } },
    { session }
  );
};

// List all promos (admin only)
export const listPromos = async (req, res) => {
  try {
    const promos = await Promotion.find({
      // Add any filtering logic here if needed
    }).sort({ createdAt: -1 });
    res.json(promos);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
```

### Promo Routes (`server/routes/promo.js`)

```javascript
import express from "express";
import { listPromos, createPromo, togglePause, duplicatePromo, deletePromo, applyPromo, reactivatePromo } from "../controlers/promoController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin routes (require authentication)
router.get("/", authMiddleware, listPromos);
router.post("/", authMiddleware, createPromo);
router.patch("/:id/toggle", authMiddleware, togglePause);
router.post("/:id/duplicate", authMiddleware, duplicatePromo);
router.delete("/:id", authMiddleware, deletePromo);
router.patch("/:id/reactivate", authMiddleware, reactivatePromo);

// Customer routes
router.post("/apply", applyPromo); // Can be public or add authMiddleware if needed

export default router;
```

## DATA MODELS

### Promotion Model (`server/models/Promotion.js`)

```javascript
import mongoose from "mongoose";

const PromotionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["Percentage", "Fixed Amount", "Free Shipping"], required: true },
    value: { type: Number, default: 0 },
    minSpend: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    limit: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Paused", "Scheduled"], default: "Active" },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null }
  },
  { timestamps: true }
);

PromotionSchema.index({ code: 1 });
PromotionSchema.index({ status: 1 });
PromotionSchema.index({ startsAt: 1, endsAt: 1 });

export default mongoose.model("Promotion", PromotionSchema);
```

## MOBILE IMPLEMENTATION (React Native/Expo)

### Promo Service

```javascript
// services/PromoService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class PromoService {
  constructor() {
    this.baseURL = 'http://your-api-url/api/promo';
  }

  async getAuthToken() {
    return await AsyncStorage.getItem('authToken');
  }

  // Apply promo code to cart
  async applyPromoCode(code, subtotal) {
    try {
      const response = await fetch(`${this.baseURL}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code.toUpperCase().trim(),
          subtotal: subtotal
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to apply promo code');
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available promo codes (admin only)
  async getPromoCodes() {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseURL}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch promo codes');
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new PromoService();
```

### Checkout Component with Promo Code

```javascript
// components/CheckoutScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import PromoService from '../services/PromoService';

const CheckoutScreen = ({ cartItems, navigation }) => {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);

  useEffect(() => {
    // Calculate subtotal from cart items
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setSubtotal(total);
  }, [cartItems]);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Error', 'Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);
    
    try {
      const result = await PromoService.applyPromoCode(promoCode, subtotal);
      
      if (result.success) {
        setAppliedPromo(result.data.promo);
        setDiscount(result.data.discount || 0);
        setFreeShipping(result.data.freeShipping || false);
        
        Alert.alert(
          'Success!', 
          result.data.freeShipping 
            ? 'Free shipping applied!' 
            : `Discount of ₱${result.data.discount} applied!`
        );
      } else {
        Alert.alert('Error', result.error);
        setPromoCode('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setDiscount(0);
    setFreeShipping(false);
    setPromoCode('');
  };

  const finalTotal = subtotal - discount;

  return (
    <View style={styles.container}>
      {/* Cart Items Display */}
      <View style={styles.cartSection}>
        {/* Your cart items rendering here */}
      </View>

      {/* Promo Code Section */}
      <View style={styles.promoSection}>
        <Text style={styles.sectionTitle}>Promo Code</Text>
        
        {!appliedPromo ? (
          <View style={styles.promoInputContainer}>
            <TextInput
              style={styles.promoInput}
              placeholder="Enter promo code"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={[styles.applyButton, isApplyingPromo && styles.disabledButton]}
              onPress={handleApplyPromo}
              disabled={isApplyingPromo}
            >
              <Text style={styles.applyButtonText}>
                {isApplyingPromo ? 'Applying...' : 'Apply'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.appliedPromoContainer}>
            <View style={styles.appliedPromoInfo}>
              <Text style={styles.appliedPromoCode}>{appliedPromo.code}</Text>
              <Text style={styles.appliedPromoName}>{appliedPromo.name}</Text>
              {freeShipping ? (
                <Text style={styles.discountText}>Free Shipping Applied!</Text>
              ) : (
                <Text style={styles.discountText}>-₱{discount}</Text>
              )}
            </View>
            <TouchableOpacity onPress={handleRemovePromo}>
              <Text style={styles.removePromoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Order Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text>Subtotal:</Text>
          <Text>₱{subtotal.toFixed(2)}</Text>
        </View>
        
        {discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountLabel}>Discount ({appliedPromo?.code}):</Text>
            <Text style={styles.discountAmount}>-₱{discount.toFixed(2)}</Text>
          </View>
        )}
        
        {freeShipping && (
          <View style={styles.summaryRow}>
            <Text style={styles.discountLabel}>Shipping:</Text>
            <Text style={styles.discountAmount}>FREE</Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>₱{finalTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity style={styles.checkoutButton}>
        <Text style={styles.checkoutButtonText}>
          Proceed to Payment - ₱{finalTotal.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  cartSection: {
    flex: 1,
  },
  promoSection: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
  },
  applyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appliedPromoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#d4edda',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  appliedPromoInfo: {
    flex: 1,
  },
  appliedPromoCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
  },
  appliedPromoName: {
    fontSize: 14,
    color: '#155724',
  },
  discountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  removePromoText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  summarySection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  discountLabel: {
    color: '#28a745',
  },
  discountAmount: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
  },
  checkoutButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;
```

## PROMO CODE TYPES

### 1. Percentage Discount
- **Type:** "Percentage"
- **Value:** 1-99 (percentage)
- **Max Discount:** Optional cap amount
- **Example:** 20% off with max ₱300 discount

### 2. Fixed Amount Discount
- **Type:** "Fixed Amount"
- **Value:** Fixed peso amount
- **Example:** ₱100 off

### 3. Free Shipping
- **Type:** "Free Shipping"
- **Value:** Not used
- **Effect:** Removes delivery fee

## VALIDATION RULES

### Promo Code Validation
1. **Code exists** in database
2. **Status** is "Active" (not "Paused")
3. **Start date** has passed (if set)
4. **End date** has not passed (if set)
5. **Usage limit** not exceeded (if set)
6. **Minimum spend** requirement met

### Business Rules
- Codes are case-insensitive (stored as uppercase)
- Only one promo code per order
- Percentage discounts can have maximum discount caps
- Fixed amount discounts cannot exceed subtotal
- Free shipping removes delivery fee but doesn't affect subtotal

## IMPORTANT NOTES FOR MOBILE IMPLEMENTATION

### 1. Error Handling
Always handle these error scenarios:
- Invalid promo code
- Expired promo code
- Usage limit reached
- Minimum spend not met
- Network errors

### 2. User Experience
- Show clear success/error messages
- Display discount amount prominently
- Allow easy removal of applied promo
- Validate promo before final checkout

### 3. Security
- Validate promo codes server-side
- Don't store sensitive promo data locally
- Use HTTPS for all API calls

### 4. Order Integration
When creating an order with a promo code:
1. Apply promo code first to get discount
2. Calculate final total
3. Include promo details in order creation
4. Use `redeemPromoOnOrder()` to increment usage count

### 5. Real-time Validation
- Validate promo codes before final checkout
- Re-validate if cart changes
- Handle cases where promo becomes invalid during checkout

This documentation provides everything needed to integrate promo codes as vouchers in your mobile checkout process!