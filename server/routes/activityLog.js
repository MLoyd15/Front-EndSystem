import express from "express";
import {
  getActivityLogs,
  getPendingApprovals,
  getActivityLogById,
  approveActivityLog,
  rejectActivityLog,
  getActivityStats,
} from "../controlers/activityLogController.js";
import { requireSuperAdmin } from "../middleware/activityLogMiddleware.js";
import { authMiddleware } from "../middleware/authMiddleware.js"; // Your auth middleware

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all activity logs (accessible by all admins)
router.get("/", getActivityLogs);

// Get activity statistics
router.get("/stats", getActivityStats);

// Get pending approvals (super admin only)
router.get("/pending", requireSuperAdmin, getPendingApprovals);

// Get single activity log
router.get("/:id", getActivityLogById);

// Approve activity (super admin only)
router.post("/:id/approve", requireSuperAdmin, approveActivityLog);

// Reject activity (super admin only)
router.post("/:id/reject", requireSuperAdmin, rejectActivityLog);

export default router;