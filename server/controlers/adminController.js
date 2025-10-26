import User from "../models/user.js";
import Category from "../models/category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import bcrypt from "bcrypt";

export const getStats = async (req, res) => {
  try {
    // Run the heavy hitters in parallel
    const [
      totalUsers,
      totalCategories,
      totalSales,
      revenueAgg,
      inventorySalesAgg,
      stockAgg,
      userDoc,
      // Low/Out/In stock counters (computed separately in parallel)
      lowStock,
      outOfStock,
      inStock,
    ] = await Promise.all([
      User.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
      Product.aggregate([{ $group: { _id: null, total: { $sum: "$sold" } } }]),
      Product.aggregate([{ $group: { _id: null, total: { $sum: "$stock" } } }]),
      User.findOne().select("loyaltyHistory").lean(),

      // Low stock = stock > 0 and stock < minStock (field-to-field compare)
      Product.countDocuments({
        $expr: {
          $and: [
            { $gt: ["$stock", 0] },
            { $gt: ["$minStock", 0] },
            { $lt: ["$stock", "$minStock"] },
          ],
        },
      }),

      
      Product.countDocuments({ stock: { $lte: 0 } }),
      Product.countDocuments({ stock: { $gt: 0 } }),
    ]);

    const totalRevenue = revenueAgg?.[0]?.total ?? 0;
    const inventorySales = inventorySalesAgg?.[0]?.total ?? 0;
    const inventoryStock = stockAgg?.[0]?.total ?? 0;

    const orderVolume = totalSales;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    const loyaltyHistory = Array.isArray(userDoc?.loyaltyHistory)
      ? userDoc.loyaltyHistory.slice(-5)
      : [];

    res.json({
      totalUsers,
      totalCategories,
      totalSales,
      totalRevenue,
      inventorySales,
      lowStock,
      inventoryStock,
      orderVolume,
      avgOrderValue,
      loyaltyHistory,
      inStock,
      outOfStock,
    });
  } catch (err) {
    console.error("Error in getStats:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const createDriver = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new driver user
    const newDriver = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      password: hashedPassword,
      role: 'driver'
    });

    await newDriver.save();

    // Return success response (without password)
    const driverResponse = {
      id: newDriver._id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: newDriver.role,
      createdAt: newDriver.createdAt
    };

    res.status(201).json({
      success: true,
      message: "Driver account created successfully",
      driver: driverResponse
    });

  } catch (err) {
    console.error("Error creating driver:", err);
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error while creating driver account"
    });
  }
};