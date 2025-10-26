import express from "express";
import { listPromos, createPromo, togglePause, duplicatePromo, deletePromo, applyPromo, reactivatePromo, getActivePromos, testIncrementUsed } from "../controlers/promoController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (no authentication required)
router.get("/active", getActivePromos);
router.post("/apply", applyPromo);

// Test route (for testing purposes only)
router.post("/test/increment/:code", testIncrementUsed);

// Admin (protect with your middleware)
router.get("/", authMiddleware, listPromos);
router.post("/", authMiddleware, createPromo);
router.patch("/:id/toggle", authMiddleware, togglePause);
router.post("/:id/duplicate", authMiddleware, duplicatePromo);
router.delete("/:id", authMiddleware, deletePromo);
router.patch("/:id/reactivate", reactivatePromo);


export default router;