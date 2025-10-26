import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import Delivery from './models/Delivery.js';
import User from './models/user.js';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Test mobile app order creation format
    const mobileOrderData = {
      userId: "demo-user-1234",
      items: [
        {
          productId: "68c17ee8fd4c9cbd38195d7e",
          name: "Test Product",
          price: 25.50,
          quantity: 2
        }
      ],
      total: 51.00,
      address: "123 Test Street, Manila",
      paymentMethod: "COD"
    };
    
    console.log('\n=== TESTING MOBILE ORDER CREATION ===');
    console.log('Mobile order data:', JSON.stringify(mobileOrderData, null, 2));
    
    // Simulate the order creation logic
    const { userId, items, total, address, paymentMethod } = mobileOrderData;
    
    // Convert items to products format
    const normalizedProducts = items.map(item => ({
      product: item.productId,
      quantity: item.quantity,
      price: item.price
    }));
    
    // Try to find user by userId
    let userRecord = null;
    try {
      userRecord = await User.findOne({
        $or: [
          { _id: userId },
          { email: userId },
          { name: userId },
          { username: userId }
        ]
      });
      console.log('\nFound user record:', userRecord ? userRecord.name : 'No user found');
    } catch (err) {
      console.log("Could not find user record for userId:", userId);
    }
    
    const normalizedData = {
      user: userRecord?._id || null,
      products: normalizedProducts,
      totalAmount: total,
      deliveryType: address ? "third-party" : "pickup",
      deliveryAddress: address,
      customerContact: {
        name: userRecord?.name || userId || "Mobile Customer",
        phone: userRecord?.phone || "",
        email: userRecord?.email || (userId.includes('@') ? userId : "")
      },
      deliveryCoordinates: null,
      notes: paymentMethod ? `Payment: ${paymentMethod}` : "",
      status: "pending"
    };
    
    console.log('\nNormalized order data:');
    console.log(JSON.stringify(normalizedData, null, 2));
    
    // Create test order
    const order = new Order(normalizedData);
    await order.save();
    console.log('\n✅ Test order created with ID:', order._id);
    
    // Create delivery if needed
    if (normalizedData.deliveryType && normalizedData.deliveryType !== "pickup") {
      const delivery = new Delivery({
        order: order._id,
        type: normalizedData.deliveryType,
        status: "pending",
        deliveryAddress: normalizedData.deliveryAddress,
        customer: normalizedData.customerContact
      });

      await delivery.save();
      console.log('✅ Test delivery created with ID:', delivery._id);
      console.log('Customer data in delivery:', JSON.stringify(delivery.customer, null, 2));
      
      order.delivery = delivery._id;
      await order.save();
    }
    
    console.log('\n=== TEST COMPLETED ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });