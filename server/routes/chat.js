import express from "express";
import Message from "../models/Message.js";
import auth from "../middleware/authMiddleware.js";

const router = express.Router();

/** GET /api/chat/history?orderId=...&limit=50&before=ISO */
router.get("/history", auth, async (req, res) => {
  try {
    const { orderId, limit = 50, before } = req.query;
    if (!orderId) return res.status(400).json({ success:false, message:"orderId required" });

    const q = { orderId };
    if (before) q.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(q)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success:true, messages: messages.reverse() });
  } catch (e) {
    res.status(500).json({ success:false, message:"Server error" });
  }
});

/** POST /api/chat/read */
router.post("/read", auth, async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ success:false, message:"orderId required" });
  await Message.updateMany({ orderId }, { $addToSet: { readBy: req.user._id } });
  res.json({ success:true });
});

export default router;
