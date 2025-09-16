import express from "express";
import { listDeliveries, updateDelivery } from "../controlers/deliveryController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Read — list deliveries (filtered in controller to pickup & third-party)
router.get("/", authMiddleware, listDeliveries);

// Update — update status, scheduledDate, pickupLocation, thirdPartyProvider
router.put("/:id", authMiddleware, updateDelivery);

export default router;