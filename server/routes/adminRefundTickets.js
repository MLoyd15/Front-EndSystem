// routes/adminRefundTickets.js
import express from "express";
import { listTickets, getTicket, updateTicket, bulkUpdate } from "../controlers/refundTicketController.js";
import authMiddleware from "../middleware/authMiddleware.js";


const router = express.Router();



router.get("/", authMiddleware, listTickets);          // GET /api/admin/refund-tickets?status=&q=&page=&limit=
router.get("/:id", authMiddleware, getTicket);        // GET /api/admin/refund-tickets/:id
router.put("/:id", authMiddleware, updateTicket);     // PUT /api/admin/refund-tickets/:id  { status, adminNote, paymongoRefundId }
router.post("/bulk",authMiddleware , bulkUpdate);     // POST /api/admin/refund-tickets/bulk   { ids: [], status: "under_review" }

export default router;
