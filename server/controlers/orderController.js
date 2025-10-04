// order controller website

import Order from "../models/Order.js";

// GET all orders with summary stats (+ sales by category)
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
      .populate("user", "name email loyaltyPoints loyaltyTier")
      .populate("products.product", "name price category"); // ← (category helps if populated)

    // ✅ Order volume (total count)
    const orderCount = await Order.countDocuments(query);

    // ✅ Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // ✅ Average order value (return a number)
    const avgOrderValue =
      orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(2)) : 0;

    // ✅ Sales by Category (robust)
    const salesByCategory = await Order.aggregate([
      { $match: query },
      { $unwind: "$products" },

      // Normalize common item fields
      {
        $set: {
          itemProductId: { $ifNull: ["$products.product", "$products.productId"] },
          itemQty: { $ifNull: ["$products.quantity", 0] },
          itemUnitPrice: { $ifNull: ["$products.price", null] },
          itemCategory: { $ifNull: ["$products.category", null] }, // snapshot on item, if you ever store it
          itemType: { $ifNull: ["$products.type", "product"] }, // Detect type (product or bundle)
        }
      },

      // Handle Product and Bundle Logic
      {
        $lookup: {
          from: "products",
          localField: "itemProductId",
          foreignField: "_id",
          as: "prod"
        }
      },
      { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },

      // If product.category is an ObjectId, resolve Category doc (collection = 'categories')
      {
        $lookup: {
          from: "categories",
          localField: "prod.category",
          foreignField: "_id",
          as: "cat"
        }
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },

      // Handle bundles (use price from the bundle, not individual products)
      {
        $lookup: {
          from: "bundles",
          localField: "itemProductId", // if it's a bundle, fetch bundle
          foreignField: "_id",
          as: "bundle"
        }
      },
      { $unwind: { path: "$bundle", preserveNullAndEmptyArrays: true } },

      // If the product is a bundle, calculate revenue based on bundle price
      {
        $set: {
          resolvedPrice: {
            $cond: [
              { $eq: ["$itemType", "bundle"] }, // If it's a bundle, use bundle price
              { $ifNull: ["$bundle.price", 0] },
              { $ifNull: ["$itemUnitPrice", { $ifNull: ["$prod.price", 0] }] }
            ]
          }
        }
      },

      // Resolve category name (handle if category is missing, use fallback)
      {
        $set: {
          resolvedCategory: {
            $ifNull: [
              "$itemCategory",
              { $ifNull: ["$cat.categoryName", "$cat.name"] }, // <-- handles both field names
              "Uncategorized"
            ]
          }
        }
      },

      // Group and sum
      {
        $group: {
          _id: "$resolvedCategory",
          category: { $first: "$resolvedCategory" },
          units: { $sum: "$itemQty" },
          revenue: { $sum: { $multiply: ["$itemQty", "$resolvedPrice"] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $project: { _id: 0, category: 1, units: 1, revenue: 1 } }
    ]);

    res.json({
      orders,
      summary: {
        orderCount,
        totalRevenue,
        avgOrderValue,
        salesByCategory, // ← ✅ NEW: include it in the response
      },
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};