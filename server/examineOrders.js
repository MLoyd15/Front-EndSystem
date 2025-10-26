import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import User from './models/user.js';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get a few orders to examine their structure
    const orders = await Order.find({}).limit(10);
    
    console.log('\n=== DETAILED ORDER EXAMINATION ===');
    for (let i = 0; i < Math.min(5, orders.length); i++) {
      const order = orders[i];
      console.log(`\n--- Order ${i + 1} ---`);
      console.log('ID:', order._id);
      console.log('Full Order Object:');
      console.log(JSON.stringify(order, null, 2));
      console.log('---');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });