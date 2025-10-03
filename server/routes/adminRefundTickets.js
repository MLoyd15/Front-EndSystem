// routes/adminRefundTickets.js
import express from "express";
import { listTickets, getTicket, updateTicket, bulkUpdate } from "../controlers/refundTicketController.js";
import { isAuth, isAdmin } from "../middleware/auth.js"; // adapt to your middleware

const router = express.Router();

router.use(isAuth, isAdmin); // all routes below require admin

router.get("/", listTickets);          // GET /api/admin/refund-tickets?status=&q=&page=&limit=
router.get("/:id", getTicket);        // GET /api/admin/refund-tickets/:id
router.put("/:id", updateTicket);     // PUT /api/admin/refund-tickets/:id  { status, adminNote, paymongoRefundId }
router.post("/bulk", bulkUpdate);     // POST /api/admin/refund-tickets/bulk   { ids: [], status: "under_review" }

export default router;
