import User from "../models/user.js";
import Category from "../models/category.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

export const getStats = async (req, res) => {
  try {
    // Count documents directly
    const totalUsers = await User.countDocuments();
    const totalCategories = await Category.countDocuments();
    const totalSales = await Order.countDocuments();

    // Aggregate revenue
    const revenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Inventory KPIs
    const inventorySalesAgg = await Product.aggregate([
      { $group: { _id: null, total: { $sum: "$sold" } } }
    ]);
    const inventorySales = inventorySalesAgg[0]?.total || 0;

    const lowStock = await Product.countDocuments({ stock: { $lt: 10 } });

    const stockAgg = await Product.aggregate([
      { $group: { _id: null, total: { $sum: "$stock" } } }
    ]);
    const inventoryStock = stockAgg[0]?.total || 0;
    // ✅ New: Order Analytics
    const orderVolume = totalSales
    const avgOrderValue = totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : 0

    res.json({
      totalUsers,
      totalCategories,
      totalSales,
      totalRevenue,
      inventorySales,
      lowStock,
      inventoryStock,
      orderVolume,
      avgOrderValue
    });
  } catch (err) {
    console.error("Error in getStats:", err);
    res.status(500).json({ message: "Server error" });
  }
};