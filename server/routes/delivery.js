import express from "express";
import { listDeliveries, updateDelivery,   getResources, assignDriverVehicle } from "../controlers/deliveryController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Read — list deliveries (filtered in controller to pickup & third-party)
router.get("/", authMiddleware, listDeliveries);

// Update — update status, scheduledDate, pickupLocation, thirdPartyProvider
router.put("/:id", authMiddleware, updateDelivery);
// Get drivers & vehicles for assignment
router.get("/resources/all", authMiddleware, getResources);

// Assign driver & vehicle to a delivery
router.put("/:id/assign", authMiddleware, assignDriverVehicle);

export default router;