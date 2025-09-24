import express from "express";
import { listDeliveries, updateDelivery,   getResources, assignDriverVehicle } from "../controlers/deliveryController.js";
import authMiddleware, { requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, listDeliveries);

// Admin can change base fields
router.put("/:id", authMiddleware, requireRole(["admin", "driver"]), updateDelivery);

// Admin only: resources / assignment
router.get("/resources/all", authMiddleware, requireRole(["admin", "driver"]), getResources);
router.put("/:id/assign", authMiddleware, requireRole(["admin", "driver"]), assignDriverVehicle);

export default router;