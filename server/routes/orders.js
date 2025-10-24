import express from "express";
import { getOrders, createOrder } from "../controlers/orderController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, getOrders);
router.post("/", authenticateToken, createOrder);

export default router;