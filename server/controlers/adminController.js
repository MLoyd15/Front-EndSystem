import User from "../models/user.js";
import Delivery from "../models/Delivery.js";
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

export const getDrivers = async (req, res) => {
  try {
    // Fetch all drivers from User model with role 'driver'
    const drivers = await User.find({ role: 'driver' })
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({
      success: true,
      drivers
    });

  } catch (err) {
    console.error("Error fetching drivers:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching drivers"
    });
  }
};

export const createDriver = async (req, res) => {
  try {
    const { name, email, phone, password, licenseImage, governmentIdImage } = req.body;

    console.log('Creating driver with data:', { name, email, phone, hasLicense: !!licenseImage }); // Debug log

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

    // Create driver data object
    const driverData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      password: hashedPassword,
      role: 'driver',
      active: true
    };

    // Add licenseImage if provided
    if (licenseImage && licenseImage.trim() !== '') {
      driverData.licenseImage = licenseImage.trim();
      console.log('License image URL added:', licenseImage); // Debug log
    }

    // Add governmentIdImage if provided
    if (governmentIdImage && governmentIdImage.trim() !== '') {
      driverData.governmentIdImage = governmentIdImage.trim();
      console.log('Government ID image URL added:', governmentIdImage);
    }

    // Create new driver as user with role 'driver'
    const newDriver = new User(driverData);
    await newDriver.save();

    console.log('Driver created successfully with ID:', newDriver._id); // Debug log
    console.log('Saved license image:', newDriver.licenseImage); // Debug log
    console.log('Saved government ID image:', newDriver.governmentIdImage); // Debug log

    // Return success response (without password)
    const driverResponse = {
      id: newDriver._id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      role: newDriver.role,
      licenseImage: newDriver.licenseImage,
      governmentIdImage: newDriver.governmentIdImage,
      active: newDriver.active,
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
      message: "Internal server error while creating driver account",
      error: err.message
    });
  }
};

// Update driver status (activate/deactivate)
export const updateDriverStatus = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Active status must be a boolean value"
      });
    }

    const driver = await User.findOneAndUpdate(
      { _id: driverId, role: 'driver' },
      { active },
      { new: true }
    ).select('-password');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: `Driver ${active ? 'activated' : 'deactivated'} successfully`,
      driver
    });

  } catch (err) {
    console.error("Error updating driver status:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating driver status"
    });
  }
};

// Update driver license image
export const updateDriverLicense = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { licenseImage } = req.body;

    if (!licenseImage) {
      return res.status(400).json({
        success: false,
        message: "License image URL is required"
      });
    }

    const driver = await User.findOneAndUpdate(
      { _id: driverId, role: 'driver' },
      { licenseImage },
      { new: true }
    ).select('-password');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver license updated successfully",
      driver
    });

  } catch (err) {
    console.error("Error updating driver license:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating driver license"
    });
  }
};

// Update driver government ID image
export const updateDriverGovernmentId = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { governmentIdImage } = req.body;

    if (!governmentIdImage) {
      return res.status(400).json({
        success: false,
        message: "Government ID image URL is required"
      });
    }

    const driver = await User.findOneAndUpdate(
      { _id: driverId, role: 'driver' },
      { governmentIdImage },
      { new: true }
    ).select('-password');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver government ID updated successfully",
      driver
    });

  } catch (err) {
    console.error("Error updating driver government ID:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating driver government ID"
    });
  }
};

// Delete driver
export const deleteDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    // Verify driver exists
    const driver = await User.findOne({ _id: driverId, role: 'driver' }).select('-password');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Block deletion if driver is assigned to active deliveries
    const activeCount = await Delivery.countDocuments({
      assignedDriver: driverId,
      status: { $in: ['pending', 'assigned', 'in-transit'] }
    });
    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete driver assigned to ${activeCount} active deliveries`
      });
    }

    await User.deleteOne({ _id: driverId });
    return res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while deleting driver' });
  }
};