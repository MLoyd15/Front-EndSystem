import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Delivery from './models/Delivery.js';
import Order from './models/Order.js';
import User from './models/user.js';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const deliveries = await Delivery.find({})
      .populate({
        path: "order",
        select: "user items products totalAmount deliveryAddress status deliveryType createdAt totalWeightKg customerContact",
        populate: {
          path: "user",
          select: "name email address phone loyaltyPoints loyaltyTier"
        }
      })
      .limit(5);
    
    console.log('\n=== DELIVERY DATA SAMPLE ===');
    deliveries.forEach((d, i) => {
      console.log(`\nDelivery ${i + 1}:`);
      console.log('ID:', d._id);
      console.log('Customer field:', JSON.stringify(d.customer, null, 2));
      console.log('Order user:', JSON.stringify(d.order?.user, null, 2));
      console.log('Order customerContact:', JSON.stringify(d.order?.customerContact, null, 2));
      console.log('Status:', d.status);
      console.log('Type:', d.type);
      console.log('Order ID:', d.order?._id);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });