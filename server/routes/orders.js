import express from "express";
import { getOrders } from "../controlers/orderController.js";

const router = express.Router();

// GET /api/orders
router.get("/", getOrders);

export default router;