import Delivery from "../models/Delivery.js";

// List deliveries
export async function listDeliveries(req, res) {
  try {
    const { type, status, q: search } = req.query;
    const q = {};

    if (type) {
      q.type = type; 
    }

    if (status) {
      q.status = new RegExp(`^${String(status).replace(/-/g, " ")}$`, "i");
    }

    // Text search across common delivery fields
    if (search) {
      q.$or = [
        { deliveryAddress: new RegExp(search, "i") },
        { pickupLocation: new RegExp(search, "i") },
      ];
    }

    const deliveries = await Delivery.find(q)
      .populate({
        path: "order",
        select: "status totalAmount createdAt products",
        populate: { path: "products.product", select: "name price" }
      })
      .lean();

    res.json({ success: true, deliveries });
  } catch (e) {
    res.status(500).json({ success: false, message: "Fetch failed" });
  }
}

// update only allowed fields for pickups/3rd-party
export async function updateDelivery(req, res) {
  try {
    const allowed = ["status", "scheduledDate", "pickupLocation", "thirdPartyProvider"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    const updated = await Delivery.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, delivery: updated });
  } catch (e) {
    res.status(400).json({ success: false, message: "Update failed", error: e.message });
  }
}