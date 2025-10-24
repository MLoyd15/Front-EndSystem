import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getOrders, createOrder } from "../controlers/orderController.js";

const router = express.Router();
router.get("/", authMiddleware, getOrders);
router.post("/", authMiddleware, createOrder);

export default router;