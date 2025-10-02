import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Driver from "../models/Driver.js";
import Vehicle from "../models/Vehicle.js";

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
      query.$or = [{ deliveryAddress: rx }, { pickupLocation: rx }];
    }

    // Role-based restriction: if driver, only their own deliveries
    if (req.user?.role === "driver") {
      query.assignedDriver = req.user.id;
    }

    const deliveries = await Delivery.find(query)
      .populate({
        path: "order",
        select: "status totalAmount createdAt products",
        populate: [
          { path: "products.product", select: "name price" },
          { path: "user", select: "name email phone address" } // ← ADD THIS
        ]
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

// -------------------- Update (pickup / 3rd-party only) --------------------
export async function updateDelivery(req, res) {
  try {
    const allowed = ["status", "scheduledDate", "pickupLocation", "thirdPartyProvider"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    const updated = await Delivery.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, delivery: updated });
  } catch (e) {
    res.status(400).json({ success: false, message: "Update failed", error: e.message });
  }
}

// -------------------- Drivers + Vehicles --------------------
export async function getResources(req, res) {
  try {
    const drivers = await Driver.find({ active: true }).select("name phone").sort({ name: 1 });
    const vehicles = await Vehicle.find({ active: true }).select("plate capacityKg").sort({ plate: 1 });
    res.json({ success: true, drivers, vehicles });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch resources" });
  }
}

// -------------------- Assign driver + vehicle --------------------
// -------------------- Assign driver + vehicle --------------------
export async function assignDriverVehicle(req, res) {
  try {
    const { id } = req.params;
    const { driverId, vehicleId, status } = req.body; // status optional

    // optional: quick ObjectId validation to avoid CastError noise
    const isId = (v) => mongoose.Types.ObjectId.isValid(v);
    if (!isId(id) || !isId(driverId) || !isId(vehicleId)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const [driver, vehicle] = await Promise.all([
      Driver.findById(driverId).select("_id"),
      Vehicle.findById(vehicleId).select("_id"),
    ]);
    if (!driver || !vehicle) {
      return res.status(400).json({ success: false, message: "Invalid driver or vehicle" });
    }

    const update = {
      assignedDriver: driver._id,
      assignedVehicle: vehicle._id,
      status: "assigned" // Automatically set to assigned when both driver and vehicle are assigned
    };
    
    // Only override the automatic "assigned" status if client explicitly sends a different status
    if (status && status !== "assigned") {
      update.status = status;
    }

    const delivery = await Delivery.findByIdAndUpdate(id, update, { new: true })
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "plate capacityKg");

    if (!delivery) return res.status(404).json({ success: false, message: "Delivery not found" });

    res.json({ success: true, delivery });
  } catch (e) {
    res.status(400).json({ success: false, message: "Assign failed", error: e.message });
  }
}