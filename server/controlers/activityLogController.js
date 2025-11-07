// controllers/activityLogController.js
import ActivityLog from "../models/ActivityLog.js";
import Product from "../models/Product.js";
import Category from "../models/category.js";
import Delivery from "../models/Delivery.js";

/**
 * Get all activity logs with filters
 * GET /api/activity-logs
 */
export const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      action,
      entity,
      adminId,
      startDate,
      endDate,
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (adminId) filter.adminId = adminId;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("adminId", "name email role")
        .populate("reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity logs",
    });
  }
};

/**
 * Get pending approvals
 * GET /api/activity-logs/pending
 */
export const getPendingApprovals = async (req, res) => {
  try {
    const pendingLogs = await ActivityLog.find({ status: "PENDING" })
      .populate("adminId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: pendingLogs,
      count: pendingLogs.length,
    });
  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending approvals",
    });
  }
};

/**
 * Get single activity log by ID
 * GET /api/activity-logs/:id
 */
export const getActivityLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await ActivityLog.findById(id)
      .populate("adminId", "name email role")
      .populate("reviewedBy", "name email")
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "Activity log not found",
      });
    }

    res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity log",
    });
  }
};

/**
 * Approve an activity log
 * POST /api/activity-logs/:id/approve
 */
export const approveActivityLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const superAdmin = req.user;

    // Check if super admin
    if (superAdmin.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Only super admins can approve actions",
      });
    }

    const log = await ActivityLog.findById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "Activity log not found",
      });
    }

    if (log.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: `Cannot approve: This action has already been ${log.status.toLowerCase()}`,
      });
    }

    // Update log status
    log.status = "APPROVED";
    log.reviewedBy = superAdmin._id;
    log.reviewedByName = superAdmin.name;
    log.reviewedAt = new Date();
    log.reviewNotes = notes;

    await log.save();

    // Execute the approved action
    await executeApprovedAction(log);

    res.json({
      success: true,
      message: "Activity approved successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error approving activity log:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to approve activity",
    });
  }
};

/**
 * Reject an activity log
 * POST /api/activity-logs/:id/reject
 */
export const rejectActivityLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const superAdmin = req.user;

    // Check if super admin
    if (superAdmin.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: "Only super admins can reject actions",
      });
    }

    const log = await ActivityLog.findById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        error: "Activity log not found",
      });
    }

    if (log.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        error: `Cannot reject: This action has already been ${log.status.toLowerCase()}`,
      });
    }

    // Update log status
    log.status = "REJECTED";
    log.reviewedBy = superAdmin._id;
    log.reviewedByName = superAdmin.name;
    log.reviewedAt = new Date();
    log.reviewNotes = notes || "Action rejected by super admin";

    await log.save();

    // Rollback any temporary changes if needed
    await rollbackAction(log);

    res.json({
      success: true,
      message: "Activity rejected successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error rejecting activity log:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to reject activity",
    });
  }
};

/**
 * Get activity statistics
 * GET /api/activity-logs/stats
 */
export const getActivityStats = async (req, res) => {
  try {
    const stats = await ActivityLog.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          byAction: [
            {
              $group: {
                _id: "$action",
                count: { $sum: 1 },
              },
            },
          ],
          byEntity: [
            {
              $group: {
                _id: "$entity",
                count: { $sum: 1 },
              },
            },
          ],
          recentActivity: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error("Error fetching activity stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity statistics",
    });
  }
};

/**
 * Execute approved action (apply the changes)
 */
async function executeApprovedAction(log) {
  try {
    console.log(`🔧 Executing approved action: ${log.action} for ${log.entity}`);
    
    switch (log.action) {
      // ============ PRODUCT ACTIONS ============
      case "CREATE_PRODUCT":
        if (log.entityId) {
          await Product.findByIdAndUpdate(log.entityId, { 
            active: true 
          });
          console.log(`✅ Product ${log.entityId} marked as active`);
        }
        break;

      case "UPDATE_PRODUCT":
        if (log.entityId && log.changes?.after) {
          await Product.findByIdAndUpdate(log.entityId, log.changes.after);
          console.log(`✅ Product ${log.entityId} updated`);
        }
        break;

      case "DELETE_PRODUCT":
        if (log.entityId) {
          await Product.findByIdAndDelete(log.entityId);
          console.log(`✅ Product ${log.entityId} deleted`);
        }
        break;

      // ============ CATEGORY ACTIONS ============
      case "CREATE_CATEGORY":
        if (log.entityId) {
          await Category.findByIdAndUpdate(log.entityId, { 
            active: true 
          });
          console.log(`✅ Category ${log.entityId} marked as active`);
        }
        break;

      case "UPDATE_CATEGORY":
        if (log.entityId && log.changes?.after) {
          await Category.findByIdAndUpdate(log.entityId, log.changes.after);
          console.log(`✅ Category ${log.entityId} updated`);
        }
        break;

      case "DELETE_CATEGORY":
        if (log.entityId) {
          // Check if category has products before deleting
          const productsCount = await Product.countDocuments({ category: log.entityId });
          
          if (productsCount > 0) {
            console.warn(`⚠️  Category ${log.entityId} has ${productsCount} products.`);
            // Move products to null/uncategorized
            await Product.updateMany({ category: log.entityId }, { category: null });
          }
          
          await Category.findByIdAndDelete(log.entityId);
          console.log(`✅ Category ${log.entityId} deleted`);
        }
        break;

      // ============ DELIVERY ACTIONS ============
      case "UPDATE_DELIVERY":
        if (log.entityId && log.changes?.after) {
          await Delivery.findByIdAndUpdate(log.entityId, log.changes.after, { new: true });
          console.log(`✅ Delivery ${log.entityId} updated`);
        }
        break;

      default:
        console.log(`⚠️  No specific action handler for: ${log.action}`);
    }
  } catch (error) {
    console.error("❌ Error executing approved action:", error);
    throw error;
  }
}

/**
 * Rollback rejected action
 */
async function rollbackAction(log) {
  try {
    console.log(`🔄 Rolling back rejected action: ${log.action} for ${log.entity}`);
    
    switch (log.action) {
      // ============ PRODUCT ROLLBACKS ============
      case "CREATE_PRODUCT":
        if (log.entityId) {
          // Delete the product that was pending
          await Product.findByIdAndDelete(log.entityId);
          console.log(`🔄 Product ${log.entityId} deleted (rollback)`);
        }
        break;

      case "UPDATE_PRODUCT":
        if (log.entityId && log.changes?.before) {
          await Product.findByIdAndUpdate(log.entityId, log.changes.before);
          console.log(`🔄 Product ${log.entityId} restored to previous state`);
        }
        break;

      case "DELETE_PRODUCT":
        if (log.entityId && log.changes?.before) {
          // Restore the product
          await Product.findByIdAndUpdate(
            log.entityId, 
            { ...log.changes.before, active: true },
            { upsert: true }
          );
          console.log(`🔄 Product ${log.entityId} restored from deletion`);
        }
        break;

      // ============ CATEGORY ROLLBACKS ============
      case "CREATE_CATEGORY":
        if (log.entityId) {
          // Delete the category that was pending
          await Category.findByIdAndDelete(log.entityId);
          console.log(`🔄 Category ${log.entityId} deleted (rollback)`);
        }
        break;

      case "UPDATE_CATEGORY":
        if (log.entityId && log.changes?.before) {
          await Category.findByIdAndUpdate(log.entityId, log.changes.before);
          console.log(`🔄 Category ${log.entityId} restored to previous state`);
        }
        break;

      case "DELETE_CATEGORY":
        if (log.entityId && log.changes?.before) {
          await Category.findByIdAndUpdate(
            log.entityId, 
            { ...log.changes.before, active: true },
            { upsert: true }
          );
          console.log(`🔄 Category ${log.entityId} restored from deletion`);
        }
        break;

      // ============ DELIVERY ROLLBACKS ============
      case "UPDATE_DELIVERY":
        if (log.entityId && log.changes?.before) {
          await Delivery.findByIdAndUpdate(log.entityId, log.changes.before);
          console.log(`🔄 Delivery ${log.entityId} restored to previous state`);
        }
        break;

      default:
        console.log(`⚠️  No specific rollback handler for: ${log.action}`);
    }
  } catch (error) {
    console.error("❌ Error rolling back action:", error);
    throw error;
  }
}

export default {
  getActivityLogs,
  getPendingApprovals,
  getActivityLogById,
  approveActivityLog,
  rejectActivityLog,
  getActivityStats,
};