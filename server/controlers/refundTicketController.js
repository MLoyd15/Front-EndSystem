// controllers/refundTicketController.js
import RefundTicket from "../models/RefundTicket.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";

// Admin: list tickets with filters
export async function listTickets(req, res) {
  try {
    const { status, q, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (q) {
      query.$or = [
        { reason: { $regex: q, $options: "i" } },
        { adminNote: { $regex: q, $options: "i" } },
        { paymentId: { $regex: q, $options: "i" } }
      ];
    }
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const tickets = await RefundTicket.find(query)
      .populate("order user processedBy")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    const total = await RefundTicket.countDocuments(query);
    return res.json({ ok: true, tickets, total });
  } catch (err) {
    console.error("listTickets:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Admin: get a single ticket
export async function getTicket(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok:false, message:"Invalid id" });
    const ticket = await RefundTicket.findById(id).populate("order user processedBy");
    if (!ticket) return res.status(404).json({ ok:false, message:"Ticket not found" });
    return res.json({ ok:true, ticket });
  } catch (err) {
    console.error("getTicket:", err);
    return res.status(500).json({ ok:false, error: err.message });
  }
}

// Admin: update ticket (status, adminNote, paymongoRefundId)
export async function updateTicket(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNote, paymongoRefundId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok:false, message:"Invalid id" });
    const ticket = await RefundTicket.findById(id);
    if (!ticket) return res.status(404).json({ ok:false, message:"Ticket not found" });

    // Track the admin who made the change
    if (status) {
      // optional: validate allowed transitions
      ticket.status = status;
      ticket.processedBy = req.user._id;
      ticket.processedAt = new Date();
    }
    if (adminNote !== undefined) ticket.adminNote = adminNote;
    if (paymongoRefundId !== undefined) ticket.paymongoRefundId = paymongoRefundId;

    await ticket.save();

    // If marked refunded, update order.refundedAmount (if you store such fields)
    if (status === "refunded") {
      const order = await Order.findById(ticket.order);
      if (order) {
        order.refundedAmount = (order.refundedAmount || 0) + (ticket.amount || 0);
        if (order.totalAmount && (order.refundedAmount >= order.totalAmount)) order.refundStatus = "full";
        else order.refundStatus = "partial";
        await order.save();
      }
    }

    // Optionally notify user (email/push) here

    return res.json({ ok:true, ticket });
  } catch (err) {
    console.error("updateTicket:", err);
    return res.status(500).json({ ok:false, error: err.message });
  }
}

// Optional: admin bulk update (e.g., set many tickets to under_review)
export async function bulkUpdate(req, res) {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) return res.status(400).json({ ok:false, message:"ids and status required" });
    const objectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => mongoose.Types.ObjectId(id));
    await RefundTicket.updateMany({ _id: { $in: objectIds } }, { $set: { status, processedBy: req.user._id, processedAt: new Date() }});
    return res.json({ ok:true });
  } catch (err) {
    console.error("bulkUpdate:", err);
    return res.status(500).json({ ok:false, error: err.message });
  }
}
