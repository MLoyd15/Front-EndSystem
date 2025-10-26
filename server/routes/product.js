// src/routes/product.js
import express from "express";
import * as ctrl from "../controlers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

// NEW: memory multer + cloud controllers
import { uploadMemory } from "../middleware/multerMemory.js";
import { uploadProductImages, deleteProductImage } from "../controlers/uploadController.js";

const router = express.Router();

/* ⚠️ CRITICAL: Specific routes MUST come BEFORE parameterized routes!
   Otherwise "/audit" gets matched as ":id" parameter */

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

// Admin product CRUD (auth required)
router.post("/", authMiddleware, ctrl.create);
router.patch("/:id", authMiddleware, ctrl.update);
router.put("/:id", authMiddleware, ctrl.update);
router.delete("/:id", authMiddleware, ctrl.remove);

// Catalog toggle
router.patch("/:id/catalog", ctrl.toggleCatalog);

// User routes (auth required)
router.delete("/:productId/reviews/:reviewId", authMiddleware, ctrl.deleteReview);

export default router;