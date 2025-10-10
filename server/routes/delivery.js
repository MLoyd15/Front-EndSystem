// In your delivery routes file
import {
  listDeliveries,
  getDeliveryById,        // ✅ NEW
  updateDelivery,
  updateLalamoveData,     // ✅ NEW
  getLalamoveDriverLocation, // ✅ NEW
  getResources,
  assignDriverVehicle,
  createDeliveryFromOrder // ✅ NEW
} from "../controllers/deliveryController.js";

router.get("/", protect, listDeliveries);
router.get("/:id", protect, getDeliveryById);                    // ✅ NEW
router.put("/:id", protect, updateDelivery);
router.put("/:id/lalamove", protect, updateLalamoveData);        // ✅ NEW
router.get("/:id/driver-location", protect, getLalamoveDriverLocation); // ✅ NEW
router.get("/resources/all", protect, getResources);
router.put("/:id/assign", protect, assignDriverVehicle);
router.post("/from-order", protect, createDeliveryFromOrder);    // ✅ NEW