import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import User from './models/user.js';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const orders = await Order.find({}).limit(10);
    
    console.log('\n=== ORDER DATA SAMPLE ===');
    orders.forEach((o, i) => {
      console.log(`\nOrder ${i + 1}:`);
      console.log('ID:', o._id);
      console.log('User field:', o.user);
      console.log('CustomerContact:', JSON.stringify(o.customerContact, null, 2));
      console.log('DeliveryType:', o.deliveryType);
      console.log('Status:', o.status);
    });
    
    // Check if there are any users in the database
    const userCount = await User.countDocuments();
    console.log('\n=== USER COUNT ===');
    console.log('Total users in database:', userCount);
    
    const users = await User.find({}).limit(5);
    console.log('\n=== USER SAMPLE ===');
    users.forEach((u, i) => {
      console.log(`User ${i + 1}: ${u._id} - ${u.name} (${u.email})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });