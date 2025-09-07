import express from "express";
import { getStats } from "../controlers/adminController.js";

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", getStats);

export default router;
