// order controller website

import Order from "../models/Order.js";
import Delivery from "../models/Delivery.js"; // ✅ Import Delivery

// GET all orders with summary stats (+ sales by category)
export const getOrders = async (req, res) => {
  try {
    const { startDate, endDate, status, deliveryType } = req.query; // ✅ Added filters
    let query = {};

    // ✅ Filter by date range if provided
    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // ✅ Filter by status
    if (status) {
      query.status = status;
    }

    // ✅ Filter by delivery type
    if (deliveryType) {
      query.deliveryType = deliveryType;
    }

    // ✅ Fetch all orders
    const orders = await Order.find(query)
      .populate("user", "name email phone address loyaltyPoints loyaltyTier")
      .populate("products.product", "name price category")
      .populate("delivery", "status type thirdPartyProvider assignedDriver lalamove.orderId") // ✅ Populate delivery
      .sort({ createdAt: -1 });

    // ✅ Order volume (total count)
    const orderCount = await Order.countDocuments(query);

    // ✅ Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // ✅ Average order value
    const avgOrderValue =
      orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(2)) : 0;

    // ✅ Sales by Category (your existing logic)
    const salesByCategory = await Order.aggregate([
      { $match: query },
      { $unwind: "$products" },
      {
        $set: {
          itemProductId: { $ifNull: ["$products.product", "$products.productId"] },
          itemQty: { $ifNull: ["$products.quantity", 0] },
          itemUnitPrice: { $ifNull: ["$products.price", null] },
          itemCategory: { $ifNull: ["$products.category", null] },
          itemType: { $ifNull: ["$products.type", "product"] },
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "itemProductId",
          foreignField: "_id",
          as: "prod"
        }
      },
      { $unwind: { path: "$prod", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "prod.category",
          foreignField: "_id",
          as: "cat"
        }
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "bundles",
          localField: "itemProductId",
          foreignField: "_id",
          as: "bundle"
        }
      },
      { $unwind: { path: "$bundle", preserveNullAndEmptyArrays: true } },
      {
        $set: {
          resolvedPrice: {
            $cond: [
              { $eq: ["$itemType", "bundle"] },
              { $ifNull: ["$bundle.price", 0] },
              { $ifNull: ["$itemUnitPrice", { $ifNull: ["$prod.price", 0] }] }
            ]
          }
        }
      },
      {
        $set: {
          resolvedCategory: {
            $ifNull: [
              "$itemCategory",
              { $ifNull: ["$cat.categoryName", "$cat.name"] },
              "Uncategorized"
            ]
          }
        }
      },
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

    // ✅ Delivery stats
    const deliveryStats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$deliveryType",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      orders,
      summary: {
        orderCount,
        totalRevenue,
        avgOrderValue,
        salesByCategory,
        deliveryStats // ✅ NEW
      },
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ NEW: Create order with delivery
export const createOrder = async (req, res) => {
  try {
    const { 
      user, 
      products, 
      totalAmount, 
      deliveryType, 
      deliveryAddress,
      customerContact,
      deliveryCoordinates,
      notes 
    } = req.body;

    // Create order
    const order = new Order({
      user,
      products,
      totalAmount,
      deliveryType: deliveryType || "pickup",
      deliveryAddress,
      customerContact,
      deliveryCoordinates,
      notes,
      status: "pending"
    });

    await order.save();

    // Auto-create delivery record if not pickup
    if (deliveryType && deliveryType !== "pickup") {
      const delivery = new Delivery({
        order: order._id,
        type: deliveryType,
        status: "pending",
        deliveryAddress: deliveryAddress,
        customer: customerContact
      });

      await delivery.save();
      
      order.delivery = delivery._id;
      await order.save();
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ success: false, message: "Failed to create order", error: err.message });
  }
};