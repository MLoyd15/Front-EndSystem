import User from "../models/user.js";
import Category from "../models/category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

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

      // Optional: also compute these if you want to show them
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
      // in case you want them on the UI later:
      inStock,
      outOfStock,
    });
  } catch (err) {
    console.error("Error in getStats:", err);
    res.status(500).json({ message: err?.message || "Server error" });
  }
};