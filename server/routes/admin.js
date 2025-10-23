import express from "express";
import { getStats } from "../controlers/adminController.js";
import { 
  listAdminBundles, 
  getAdminBundle, 
  createAdminBundle, 
  updateAdminBundle, 
  deleteAdminBundle
} from "../controlers/bundleController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin Statistics
router.get("/stats", authMiddleware, getStats);

// Admin Bundle Management Routes
router.get("/bundles", authMiddleware, listAdminBundles);
router.get("/bundles/:id", authMiddleware, getAdminBundle);
router.post("/bundles", authMiddleware, createAdminBundle);
router.put("/bundles/:id", authMiddleware, updateAdminBundle);
router.delete("/bundles/:id", authMiddleware, deleteAdminBundle);

export default router;
