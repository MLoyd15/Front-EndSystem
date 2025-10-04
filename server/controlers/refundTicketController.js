// controllers/refundTicketController.js
import RefundTicket from "../models/RefundTicket.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";
import axios from "axios";

// PayMongo configuration
const PAYMONGO_SECRET_KEY = sk_test_AFe1xWMyHWy9FRzVie9SrSQP;
const PAYMONGO_API_URL = "https://api.paymongo.com/v1";

// Helper function to create PayMongo refund
async function createPayMongoRefund(paymentIntentId, amount, reason) {
  try {
    const auth = Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64");
    
    const response = await axios.post(
      `${PAYMONGO_API_URL}/refunds`,
      {
        data: {
          attributes: {
            amount: amount, // amount in centavos
            payment_intent_id: paymentIntentId,
            reason: reason || "requested_by_customer",
            notes: reason
          }
        }
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        }
      }
    );

    return {
      success: true,
      refundId: response.data.data.id,
      status: response.data.data.attributes.status,
      data: response.data.data
    };
  } catch (error) {
    console.error("PayMongo refund error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.detail || error.message
    };
  }
}

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
    if (!mongoose.Types.ObjectId.isValid(id)) 
      return res.status(400).json({ ok: false, message: "Invalid id" });
    
    const ticket = await RefundTicket.findById(id).populate("order user processedBy");
    if (!ticket) 
      return res.status(404).json({ ok: false, message: "Ticket not found" });
    
    return res.json({ ok: true, ticket });
  } catch (err) {
    console.error("getTicket:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Admin: update ticket (status, adminNote, paymongoRefundId)
export async function updateTicket(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNote, paymongoRefundId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) 
      return res.status(400).json({ ok: false, message: "Invalid id" });
    
    const ticket = await RefundTicket.findById(id).populate("order");
    if (!ticket) 
      return res.status(404).json({ ok: false, message: "Ticket not found" });

    const order = ticket.order;

    // Track the admin who made the change
    if (status) {
      ticket.status = status;
      ticket.processedBy = req.user._id;
      ticket.processedAt = new Date();

      // If status is approved and payment method is E-Payment, process PayMongo refund
      if (status === "approved" && order.paymentMethod === "E-Payment") {
        // Get PayMongo session ID from order
        const paymongoSessionId = order.paymongoSessionId;
        
        if (!paymongoSessionId) {
          return res.status(400).json({ 
            ok: false, 
            message: "No PayMongo session found for this order" 
          });
        }

        // Create refund via PayMongo
        const refundResult = await createPayMongoRefund(
          paymongoSessionId,
          ticket.amount,
          ticket.reason
        );

        if (!refundResult.success) {
          // Update ticket with error info
          ticket.status = "under_review"; // Revert status
          ticket.adminNote = `${adminNote || ""}\n\nPayMongo refund failed: ${refundResult.error}`;
          await ticket.save();
          
          return res.status(400).json({ 
            ok: false, 
            message: "PayMongo refund failed", 
            error: refundResult.error,
            ticket 
          });
        }

        // Save PayMongo refund ID
        ticket.paymongoRefundId = refundResult.refundId;
        
        // If refund is successful, mark as refunded
        if (refundResult.status === "succeeded") {
          ticket.status = "refunded";
        }
      }
    }

    if (adminNote !== undefined) ticket.adminNote = adminNote;
    if (paymongoRefundId !== undefined) ticket.paymongoRefundId = paymongoRefundId;

    await ticket.save();

    // If marked refunded, update order.refundedAmount
    if (ticket.status === "refunded") {
      order.refundedAmount = (order.refundedAmount || 0) + (ticket.amount || 0);
      
      if (order.total && (order.refundedAmount >= order.total)) {
        order.refundStatus = "full";
      } else {
        order.refundStatus = "partial";
      }
      
      await order.save();
    }

    // Populate the ticket before returning
    await ticket.populate("order user processedBy");

    // TODO: Optionally notify user (email/push) here

    return res.json({ ok: true, ticket });
  } catch (err) {
    console.error("updateTicket:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Admin: Process refund manually (for already approved tickets)
export async function processRefund(req, res) {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) 
      return res.status(400).json({ ok: false, message: "Invalid id" });
    
    const ticket = await RefundTicket.findById(id).populate("order");
    if (!ticket) 
      return res.status(404).json({ ok: false, message: "Ticket not found" });

    if (ticket.status !== "approved") {
      return res.status(400).json({ 
        ok: false, 
        message: "Ticket must be approved before processing refund" 
      });
    }

    const order = ticket.order;

    if (order.paymentMethod === "E-Payment") {
      const paymongoSessionId = order.paymongoSessionId;
      
      if (!paymongoSessionId) {
        return res.status(400).json({ 
          ok: false, 
          message: "No PayMongo session found for this order" 
        });
      }

      const refundResult = await createPayMongoRefund(
        paymongoSessionId,
        ticket.amount,
        ticket.reason
      );

      if (!refundResult.success) {
        return res.status(400).json({ 
          ok: false, 
          message: "PayMongo refund failed", 
          error: refundResult.error 
        });
      }

      ticket.paymongoRefundId = refundResult.refundId;
      
      if (refundResult.status === "succeeded") {
        ticket.status = "refunded";
        ticket.processedBy = req.user._id;
        ticket.processedAt = new Date();
        
        // Update order refund amount
        order.refundedAmount = (order.refundedAmount || 0) + ticket.amount;
        
        if (order.total && (order.refundedAmount >= order.total)) {
          order.refundStatus = "full";
        } else {
          order.refundStatus = "partial";
        }
        
        await order.save();
      }

      await ticket.save();
      await ticket.populate("order user processedBy");

      return res.json({ 
        ok: true, 
        ticket, 
        refundData: refundResult.data 
      });
    } else {
      // For non-e-payment, just mark as refunded
      ticket.status = "refunded";
      ticket.processedBy = req.user._id;
      ticket.processedAt = new Date();
      await ticket.save();
      await ticket.populate("order user processedBy");

      return res.json({ 
        ok: true, 
        ticket, 
        message: "Manual refund marked as completed" 
      });
    }
  } catch (err) {
    console.error("processRefund:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// Optional: admin bulk update (e.g., set many tickets to under_review)
export async function bulkUpdate(req, res) {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || !status) 
      return res.status(400).json({ ok: false, message: "ids and status required" });
    
    const objectIds = ids
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    
    await RefundTicket.updateMany(
      { _id: { $in: objectIds } }, 
      { 
        $set: { 
          status, 
          processedBy: req.user._id, 
          processedAt: new Date() 
        }
      }
    );
    
    return res.json({ ok: true });
  } catch (err) {
    console.error("bulkUpdate:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}