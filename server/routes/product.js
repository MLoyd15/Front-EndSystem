// src/routes/product.js
import express from "express";
import * as ctrl from "../controlers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { bypassApprovalForSuperAdmin } from "../middleware/activityLogMiddleware.js"; // ← ADDED
// NEW: memory multer + cloud controllers
import { uploadMemory } from "../middleware/multerMemory.js";
import { uploadProductImages, deleteProductImage } from "../controlers/uploadController.js";

const router = express.Router();

// Public list routes (no auth required)
router.get("/flat", ctrl.listFlat);
router.get("/", ctrl.list);

// ✅ Admin audit routes (BEFORE /:id) - auth required
router.get("/audit", authMiddleware, ctrl.auditList);
router.post("/audit/reconcile", authMiddleware, ctrl.auditReconcile);

/* ------------------ IMAGE UPLOADS (Cloudinary) ------------------ */
// POST /api/products/upload  (form-data: images[])
router.post(
  "/upload",
  authMiddleware,
  uploadMemory.array("images", 6),
  uploadProductImages
);

// DELETE /api/products/image  { publicId }
router.delete(
  "/image",
  authMiddleware,
  deleteProductImage
);

// ✅ Single product route (AFTER specific routes)
router.get("/:id", ctrl.getOne);

// ✅ Admin product CRUD with approval workflow (CHANGED)
router.post("/", authMiddleware, bypassApprovalForSuperAdmin, ctrl.create);
router.patch("/:id", authMiddleware, bypassApprovalForSuperAdmin, ctrl.update);
router.put("/:id", authMiddleware, bypassApprovalForSuperAdmin, ctrl.update);
router.delete("/:id", authMiddleware, bypassApprovalForSuperAdmin, ctrl.remove);

// Catalog toggle (no approval needed)
router.patch("/:id/catalog", authMiddleware, ctrl.toggleCatalog);

// User routes (auth required)
router.delete("/:productId/reviews/:reviewId", authMiddleware, ctrl.deleteReview);

export default router;