import express from "express";
import { getStats, createDriver, getDrivers, updateDriverStatus, updateDriverLicense } from "../controlers/adminController.js";
import { 
  listAdminBundles, 
  getAdminBundle, 
  createAdminBundle, 
  updateAdminBundle, 
  deleteAdminBundle
} from "../controlers/bundleController.js";
import { uploadDriverLicense } from "../controlers/uploadController.js";
import { uploadMemory } from "../middleware/multerMemory.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Statistics
router.get("/stats", authMiddleware, getStats);

// Driver Management
router.get("/drivers", authMiddleware, getDrivers);
router.post("/create-driver", authMiddleware, createDriver);
router.patch("/drivers/:driverId/status", authMiddleware, updateDriverStatus);
router.patch("/drivers/:driverId/license", authMiddleware, updateDriverLicense);
router.post("/upload-license", authMiddleware, uploadMemory.single("license"), uploadDriverLicense);

// Admin Bundle Management Routes
router.get("/bundles", authMiddleware, listAdminBundles);
router.get("/bundles/:id", authMiddleware, getAdminBundle);
router.post("/bundles", authMiddleware, createAdminBundle);
router.put("/bundles/:id", authMiddleware, updateAdminBundle);
router.delete("/bundles/:id", authMiddleware, deleteAdminBundle);

export default router;
