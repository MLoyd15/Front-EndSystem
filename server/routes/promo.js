import express from "express";
import { listPromos, createPromo, togglePause, duplicatePromo, deletePromo, applyPromo } from "../controlers/promoController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin (protect with your middleware)
router.get("/", authMiddleware, listPromos);
router.post("/", authMiddleware, createPromo);
router.patch("/:id/toggle", authMiddleware, togglePause);
router.post("/:id/duplicate", authMiddleware, duplicatePromo);
router.delete("/:id", authMiddleware, deletePromo);

// Optional customer-side validator (can be public or protected)
router.post("/apply", applyPromo);

export default router;