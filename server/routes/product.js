// src/routes/product.js
import express from "express";
import * as ctrl from "../controlers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

// NEW: memory multer + cloud controllers
import { uploadMemory } from "../middleware/multerMemory.js";
import { uploadProductImages, deleteProductImage } from "../controlers/uploadController.js";

const router = express.Router();

// For reviews
router.get("/flat", ctrl.listFlat);
router.delete("/:productId/reviews/:reviewId", authMiddleware, ctrl.deleteReview);

// Audit
router.get("/audit", ctrl.auditList);
router.post("/audit/reconcile", ctrl.auditReconcile);

// CRUD
router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

// Catalog toggle
router.patch("/:id/catalog", ctrl.toggleCatalog);

/* ------------------ IMAGE UPLOADS (Cloudinary) ------------------ */
// POST /api/products/upload  (form-data: images[])
router.post(
  "/upload",
  authMiddleware,                 // keep auth if only admins can upload
  uploadMemory.array("images", 6),
  uploadProductImages
);

// DELETE /api/products/image  { publicId }
router.delete(
  "/image",
  authMiddleware,
  deleteProductImage
);

export default router;
