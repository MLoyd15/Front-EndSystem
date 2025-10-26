import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Delivery from './models/Delivery.js';
import Order from './models/Order.js';
import User from './models/user.js';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/your-db-name')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Get all deliveries that have empty customer data
    const deliveries = await Delivery.find({
      $or: [
        { customer: { $exists: false } },
        { 'customer.name': { $in: ['Unknown Customer', '', null] } },
        { 'customer.name': { $exists: false } }
      ]
    }).populate({
      path: 'order',
      populate: {
        path: 'user',
        select: 'name phone email address'
      }
    });
    
    console.log(`Found ${deliveries.length} deliveries with missing customer data`);
    
    let updatedCount = 0;
    
    for (const delivery of deliveries) {
      if (delivery.order) {
        const order = delivery.order;
        // Extract customer data using improved logic
        let customerData = {
          name: "Unknown Customer",
          phone: "",
          email: ""
        };

        // Priority 1: Use customerContact if available
        if (order.customerContact?.name) {
          customerData = {
            name: order.customerContact.name,
            phone: order.customerContact.phone || "",
            email: order.customerContact.email || ""
          };
        }
        // Priority 2: Use populated user data
        else if (order.user?.name) {
          customerData = {
            name: order.user.name,
            phone: order.user.phone || "",
            email: order.user.email || ""
          };
        }
        // Priority 3: Handle user ObjectId that needs to be populated
        else if (order.user && typeof order.user === 'string') {
          try {
            const user = await User.findById(order.user);
            if (user) {
              customerData = {
                name: user.name,
                phone: user.phone || "",
                email: user.email || ""
              };
            }
          } catch (err) {
            console.log(`Could not find user ${order.user} for delivery ${delivery._id}`);
          }
        }
        // Priority 4: Handle mobile app format with userId
        else if (order.userId) {
          if (order.userId.includes('@')) {
            customerData = {
              name: order.userId,
              phone: "",
              email: order.userId
            };
          } else {
            // Try to find user by userId or use it as name
            try {
              const user = await User.findOne({ 
                $or: [
                  { _id: order.userId },
                  { email: order.userId },
                  { name: order.userId },
                  { username: order.userId }
                ]
              });
              if (user) {
                customerData = {
                  name: user.name,
                  phone: user.phone || "",
                  email: user.email || ""
                };
              } else {
                customerData.name = order.userId;
              }
            } catch (err) {
              customerData.name = order.userId;
            }
          }
        }
        
        // Update the delivery
        await Delivery.findByIdAndUpdate(delivery._id, {
          customer: customerData
        });
        
        console.log(`Updated delivery ${delivery._id} with customer: ${customerData.name}`);
        updatedCount++;
      } else {
        console.log(`Delivery ${delivery._id} has no associated order`);
      }
    }
    
    console.log(`\nMigration complete! Updated ${updatedCount} deliveries.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });