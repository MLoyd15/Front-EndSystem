import express from "express";
import { 
    listDeliveries,
  getDeliveryById,        // ✅ NEW
  updateDelivery,
  updateLalamoveData,     // ✅ NEW
  getLalamoveDriverLocation, // ✅ NEW
  getResources,
  assignDriverVehicle,
  createDeliveryFromOrder
 } from "../controlers/deliveryController.js";
import authMiddleware, { requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", listDeliveries);
router.get("/:id", getDeliveryById);                    // ✅ NEW
router.put("/:id", updateDelivery);
router.put("/:id/lalamove", updateLalamoveData);        // ✅ NEW
router.get("/:id/driver-location", getLalamoveDriverLocation); // ✅ NEW
router.get("/resources/all", getResources);
router.put("/:id/assign", assignDriverVehicle);
router.post("/from-order", createDeliveryFromOrder);

export default router;