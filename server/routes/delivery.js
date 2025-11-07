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
import { bypassApprovalForSuperAdmin } from "../middleware/activityLogMiddleware.js";

const router = express.Router();

// Public fetch routes
router.get("/", listDeliveries);
router.get("/:id", getDeliveryById);                    // ✅ NEW
router.get("/:id/driver-location", getLalamoveDriverLocation); // ✅ NEW
router.get("/resources/all", getResources);

// Admin update routes with approval workflow
router.put("/:id", authMiddleware, bypassApprovalForSuperAdmin, updateDelivery);
router.put("/:id/lalamove", authMiddleware, bypassApprovalForSuperAdmin, updateLalamoveData); // ✅ NEW
router.put("/:id/assign", authMiddleware, bypassApprovalForSuperAdmin, assignDriverVehicle);
router.post("/from-order", authMiddleware, bypassApprovalForSuperAdmin, createDeliveryFromOrder);

export default router;