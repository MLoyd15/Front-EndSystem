// delivery controller website

import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Driver from "../models/Driver.js";
import User from "../models/user.js"; // ✅ Import User model for driver assignments
import Vehicle from "../models/Vehicle.js";
import Order from "../models/Order.js"; // ✅ Import Order model
import { createActivityLog } from "../middleware/activityLogMiddleware.js";

// -------------------- List deliveries --------------------
export async function listDeliveries(req, res) {
  try {
    const { type, status, q: search } = req.query;
    const query = {};

    // Filter by type if provided
    if (type) query.type = type;

    // Normalize status (accept dash, space, case-insensitive)
    if (status) {
      const norm = String(status).toLowerCase().trim().replace(/[\s_]+/g, "-");
      query.status = norm;
    }

    // Free-text search
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { deliveryAddress: rx }, 
        { pickupLocation: rx },
        { thirdPartyProvider: rx },
        { 'lalamove.orderId': rx }  // ✅ Search by Lalamove order ID
      ];
    }

    // Role-based restriction: if driver, only their own deliveries
    if (req.user?.role === "driver") {
      query.assignedDriver = req.user.id;
    }

    const deliveries = await Delivery.find(query)
      .populate({
        path: "order",
        select: "user items products totalAmount deliveryAddress status deliveryType createdAt totalWeightKg customerContact", // ✅ Added customerContact
        populate: {
          path: "user",
          select: "name email address phone loyaltyPoints loyaltyTier" // ✅ Added phone
        }
      })
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "plate capacityKg")
      .lean();

    res.json({ success: true, deliveries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
}

// -------------------- Get single delivery details --------------------
export async function getDeliveryById(req, res) {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate({
        path: "order",
        populate: [
          { path: "user", select: "name email phone address" },
          { path: "products.product", select: "name price images" }
        ]
      })
      .populate("assignedDriver", "name phone email")
      .populate("assignedVehicle", "plate capacityKg type");

    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    res.json({ success: true, delivery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
}

// -------------------- Update (pickup / 3rd-party only) --------------------
// controllers/deliveryController.js

export async function updateDelivery(req, res) {
  try {
    // ✅ Ensure authenticated for logging + approvals
    if (!req.user || !req.user._id || !req.user.name || !req.user.email) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const requiresApproval = req.requiresApproval !== false;

    const allowed = [
      "status", 
      "scheduledDate", 
      "pickupLocation", 
      "thirdPartyProvider",
      "deliveryAddress",
      "pickupCoordinates",
      "deliveryCoordinates",
      "customer",
      "deliveryFee",
      "estimatedDeliveryTime",
      "notes",
      "deliveredAt",
      "assignedDriver",
      "assignedVehicle",
      "lalamove.status",
      "lalamove.driver",
      "lalamove.orderId",
      "lalamove.shareLink"
    ];

    const updates = {};

    // ✅ Handle main status update
    if (req.body.status) {
      updates.status = req.body.status;
      console.log('📝 Updating main status to:', req.body.status);
    }

    // Handle nested lalamove.status
    if (req.body['lalamove.status']) {
      if (!updates.$set) updates.$set = {};
      updates.$set['lalamove.status'] = req.body['lalamove.status'];
      console.log('📝 Updating lalamove.status to:', req.body['lalamove.status']);
    }

    // Handle nested lalamove.driver
    if (req.body['lalamove.driver']) {
      if (!updates.$set) updates.$set = {};
      updates.$set['lalamove.driver'] = req.body['lalamove.driver'];
    }

    // ✅ Handle deliveredAt timestamp
    if (req.body.deliveredAt) {
      updates.deliveredAt = new Date(req.body.deliveredAt);
      console.log('📝 Setting deliveredAt:', updates.deliveredAt);
    }

    // Handle other simple updates
    for (const k of allowed) {
      if (k.includes('lalamove.') || k === 'status' || k === 'deliveredAt') continue;
      if (k in req.body) updates[k] = req.body[k];
    }

    console.log('🔄 Final update payload:', JSON.stringify(updates, null, 2));

    // Fetch original for logging
    const original = await Delivery.findById(req.params.id)
      .populate("order")
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "plate capacityKg");

    if (!original) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    let resultDelivery = original;

    if (!requiresApproval) {
      // Superadmin: apply immediately
      resultDelivery = await Delivery.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      )
        .populate("order")
        .populate("assignedDriver", "name phone")
        .populate("assignedVehicle", "plate capacityKg");
    }

    // Log the activity (before/after)
    try {
      const pretty = (s) => String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const statusText = updates.status
        ? pretty(updates.status)
        : (updates.$set && updates.$set['lalamove.status'] ? pretty(updates.$set['lalamove.status']) : null);

      await createActivityLog({
        adminId: req.user._id,
        adminName: req.user.name,
        adminEmail: req.user.email,
        action: 'UPDATE_DELIVERY',
        entity: 'DELIVERY',
        entityId: original._id,
        entityName: statusText || (original.type ? pretty(original.type) : 'Delivery'),
        changes: {
          before: {
            status: original.status,
            scheduledDate: original.scheduledDate,
            pickupLocation: original.pickupLocation,
            thirdPartyProvider: original.thirdPartyProvider,
            deliveryAddress: original.deliveryAddress,
            deliveredAt: original.deliveredAt,
            assignedDriver: original.assignedDriver?._id || original.assignedDriver,
            assignedVehicle: original.assignedVehicle?._id || original.assignedVehicle,
            lalamove: original.lalamove
          },
          after: updates
        },
        description: statusText
          ? `Changed delivery status to "${statusText}"`
          : 'Updated delivery details',
        requiresApproval,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logError) {
      console.error('⚠️  Failed to create activity log for delivery:', logError);
    }

    console.log('✅ Delivery update request processed:', {
      id: original._id,
      status: resultDelivery.status,
      lalamoveStatus: resultDelivery.lalamove?.status,
      requiresApproval
    });

    return res.json({
      success: true,
      message: requiresApproval ? 'Delivery update pending approval' : 'Delivery updated successfully',
      delivery: resultDelivery,
      requiresApproval
    });
  } catch (e) {
    console.error('❌ Update failed:', e);
    res.status(400).json({ success: false, message: "Update failed", error: e.message });
  }
}
// ✅ NEW: Update Lalamove-specific data
export async function updateLalamoveData(req, res) {
  try {
    // ✅ Ensure authenticated for logging + approvals
    if (!req.user || !req.user._id || !req.user.name || !req.user.email) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const requiresApproval = req.requiresApproval !== false;
    const { id } = req.params;
    const { lalamove } = req.body;

    if (!lalamove) {
      return res.status(400).json({ success: false, message: "Lalamove data required" });
    }

    const delivery = await Delivery.findById(id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }
    const before = delivery.toObject();

    // Merge lalamove data
    const merged = {
      ...delivery.lalamove,
      ...lalamove
    };

    // Update status if Lalamove order is created
    if (!requiresApproval) {
      delivery.lalamove = merged;
      if (lalamove.orderId && delivery.status === "pending") {
        delivery.status = "assigned";
      }
      await delivery.save();
    }

    // Log activity
    try {
      const pretty = (s) => String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const statusText = lalamove?.status ? pretty(lalamove.status) : (merged?.status ? pretty(merged.status) : null);
      const orderIdText = lalamove?.orderId || merged?.orderId || delivery?.lalamove?.orderId;
      await createActivityLog({
        adminId: req.user._id,
        adminName: req.user.name,
        adminEmail: req.user.email,
        action: 'UPDATE_DELIVERY',
        entity: 'DELIVERY',
        entityId: delivery._id,
        entityName: statusText || 'Lalamove',
        changes: {
          before: { lalamove: before.lalamove },
          after: { lalamove: merged }
        },
        description: statusText
          ? `Updated Lalamove status to "${statusText}"${orderIdText ? ` (orderId: ${orderIdText})` : ''}`
          : `Updated Lalamove data${orderIdText ? ` (orderId: ${orderIdText})` : ''}`,
        requiresApproval,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logError) {
      console.error('⚠️  Failed to create activity log for Lalamove update:', logError);
    }

    return res.json({
      success: true,
      message: requiresApproval ? 'Lalamove update pending approval' : 'Lalamove data updated',
      delivery,
      requiresApproval
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Update failed", error: err.message });
  }
}

// ✅ NEW: Get Lalamove driver location
export async function getLalamoveDriverLocation(req, res) {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery || !delivery.lalamove?.orderId) {
      return res.status(404).json({ 
        success: false, 
        message: "Lalamove order not found" 
      });
    }

    res.json({ 
      success: true, 
      driver: delivery.lalamove.driver,
      orderId: delivery.lalamove.orderId 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
}

// -------------------- Drivers + Vehicles --------------------
export async function getResources(req, res) {
  try {
    const drivers = await Driver.find({ active: true }).select("name phone").sort({ name: 1 });
    const vehicles = await Vehicle.find({ active: true }).select("plate capacityKg type").sort({ plate: 1 });
    res.json({ success: true, drivers, vehicles });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch resources" });
  }
}

// -------------------- Assign driver + vehicle --------------------
export async function assignDriverVehicle(req, res) {
  try {
    // ✅ Ensure authenticated for logging + approvals
    if (!req.user || !req.user._id || !req.user.name || !req.user.email) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const requiresApproval = req.requiresApproval !== false;
    const { id } = req.params;
    const { driverId, vehicleId, status } = req.body;

    // ObjectId validation
    const isId = (v) => mongoose.Types.ObjectId.isValid(v);
    if (!isId(id) || !isId(driverId) || !isId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const [driver, vehicle] = await Promise.all([
      User.findById(driverId).select("_id name phone"),
      Vehicle.findById(vehicleId).select("_id plate capacityKg"),
    ]);
    
    if (!driver || !vehicle) {
      return res.status(400).json({ success: false, message: "Invalid driver or vehicle" });
    }

    const update = {
      assignedDriver: driver._id,
      assignedVehicle: vehicle._id,
      status: "assigned"
    };
    
    if (status && status !== "assigned") {
      update.status = status;
    }

    // Fetch current
    const current = await Delivery.findById(id)
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "plate capacityKg")
      .populate("order");

    if (!current) {
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    const before = current.toObject();

    // Apply immediately for superadmin
    let delivery = current;
    if (!requiresApproval) {
      delivery = await Delivery.findByIdAndUpdate(id, update, { new: true })
        .populate("assignedDriver", "name phone")
        .populate("assignedVehicle", "plate capacityKg")
        .populate("order");
    }

    // ✅ Update order status
    if (delivery.order) {
      await Order.findByIdAndUpdate(delivery.order._id, {
        status: "ready"
      });
    }

    // Log activity
    try {
      const pretty = (s) => String(s).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const statusPretty = update.status ? pretty(update.status) : null;
      const readyText = statusPretty === 'Assigned' ? '; Order is ready to pick up' : '';
      await createActivityLog({
        adminId: req.user._id,
        adminName: req.user.name,
        adminEmail: req.user.email,
        action: 'UPDATE_DELIVERY',
        entity: 'DELIVERY',
        entityId: current._id,
        entityName: statusPretty || 'Assignment',
        changes: {
          before: {
            assignedDriver: before.assignedDriver,
            assignedVehicle: before.assignedVehicle,
            status: before.status
          },
          after: update
        },
        description: `Assigned driver "${driver.name}" and vehicle "${vehicle.plate}"${statusPretty ? `; status: "${statusPretty}"` : ''}${readyText}`,
        requiresApproval,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } catch (logError) {
      console.error('⚠️  Failed to create activity log for assignment:', logError);
    }

    res.json({
      success: true,
      message: requiresApproval ? 'Assignment update pending approval' : 'Assignment updated successfully',
      delivery,
      requiresApproval
    });
  } catch (e) {
    res.status(400).json({ success: false, message: "Assign failed", error: e.message });
  }
}

// ✅ NEW: Create delivery from order
export async function createDeliveryFromOrder(req, res) {
  try {
    const { orderId, type, pickupLocation, deliveryAddress } = req.body;

    if (!orderId || !type) {
      return res.status(400).json({ 
        success: false, 
        message: "Order ID and delivery type required" 
      });
    }

    const order = await Order.findById(orderId).populate("user", "name phone email address");
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Check if delivery already exists
    const existingDelivery = await Delivery.findOne({ order: orderId });
    if (existingDelivery) {
      return res.status(400).json({ 
        success: false, 
        message: "Delivery already exists for this order" 
      });
    }

    // Extract customer data from different order formats
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
    // Priority 3: Handle mobile app format with userId
    else if (order.userId) {
      if (order.userId.includes('@')) {
        customerData = {
          name: order.userId,
          phone: "",
          email: order.userId
        };
      } else {
        customerData = {
          name: order.userId,
          phone: "",
          email: ""
        };
      }
    }

    const delivery = new Delivery({
      order: orderId,
      type,
      status: "pending",
      pickupLocation: pickupLocation || "Warehouse, Manila",
      deliveryAddress: deliveryAddress || order.deliveryAddress || order.address || order.user?.address,
      customer: customerData
    });

    await delivery.save();

    // Link delivery to order
    order.delivery = delivery._id;
    await order.save();

    res.status(201).json({ success: true, delivery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Creation failed", error: err.message });
  }
}