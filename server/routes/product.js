import express from "express";
import * as ctrl from "../controlers/productController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/audit", ctrl.auditList);
router.post("/audit/reconcile", ctrl.auditReconcile);

// GET /api/products?search=&category=&catalog=&page=&limit=
router.get('/', ctrl.list);

// GET /api/products/:id
router.get('/:id', ctrl.getOne);

// POST /api/products
router.post('/', ctrl.create);

// PATCH /api/products/:id
router.patch('/:id', ctrl.update);
router.put('/:id', ctrl.update); 

// DELETE /api/products/:id
router.delete('/:id', ctrl.remove);

// PATCH /api/products/:id/catalog  { value: true|false }
router.patch('/:id/catalog', ctrl.toggleCatalog);
// routes/products.js  (or whatever your file is named)

/* ------------------ NEW: local image upload ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    cb(null, `${Date.now()}_${base}${ext.toLowerCase()}`);
  },
});

const fileFilter = (req, file, cb) => {
  // allow png/jpg/jpeg/webp/gif
  if (/image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB max each, up to 6 files
});

// POST /api/products/upload  (form-data: images[])
router.post("/upload", authMiddleware, upload.array("images", 6), (req, res) => {
  const base = `${req.protocol}://${req.get("host")}`;
  const urls = (req.files || []).map((f) => `${base}/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

export default router;
