import Order from "../models/Order.js";

// GET all orders with summary stats
export const getOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    // ✅ Filter by date range if provided
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // ✅ Fetch all orders
    const orders = await Order.find(query)
      .populate("user", "name email loyaltyPoints loyaltyTier") // include loyalty info
      .populate("products.product", "name price");

    // ✅ Order volume (total count)
    const orderCount = await Order.countDocuments(query);

    // ✅ Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // ✅ Average order value
    const avgOrderValue = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : 0;

    res.json({
      orders,
      summary: {
        orderCount,
        totalRevenue,
        avgOrderValue
      }
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};