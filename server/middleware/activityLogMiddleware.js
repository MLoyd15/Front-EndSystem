// middleware/activityLogMiddleware.js
import ActivityLog from "../models/ActivityLog.js";

/**
 * Middleware to log admin activities
 * Usage: Add this after authentication middleware
 */
export const logActivity = (action, entity, requiresApproval = true) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Capture response
    let responseData;
    res.json = function (data) {
      responseData = data;
      return originalJson(data);
    };

    res.send = function (data) {
      responseData = data;
      return originalSend(data);
    };

    // Continue to next middleware
    res.on("finish", async () => {
      try {
        // Only log successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const logEntry = {
            adminId: req.user?._id || req.user?.id,
            adminName: req.user?.name || "Unknown",
            adminEmail: req.user?.email || "Unknown",
            action,
            entity,
            requiresApproval,
            status: requiresApproval ? "PENDING" : "AUTO_APPROVED",
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get("user-agent"),
          };

          // Extract entity details from request/response
          if (req.body) {
            logEntry.entityName = req.body.name || req.body.title || req.body.categoryName;
            logEntry.changes = {
              before: req.originalData || null,
              after: req.body,
            };
          }

          if (req.params?.id) {
            logEntry.entityId = req.params.id;
          }

          // Generate description
          logEntry.description = generateDescription(action, entity, logEntry);

          // Create activity log
          await ActivityLog.create(logEntry);
        }
      } catch (error) {
        console.error("Error logging activity:", error);
        // Don't block the response if logging fails
      }
    });

    next();
  };
};

/**
 * Manual activity logging function
 * Use this for complex operations where middleware isn't suitable
 */
export const createActivityLog = async ({
  adminId,
  adminName,
  adminEmail,
  action,
  entity,
  entityId,
  entityName,
  changes,
  description,
  requiresApproval = true,
  ipAddress,
  userAgent,
  metadata,
}) => {
  try {
    const logEntry = await ActivityLog.create({
      adminId,
      adminName,
      adminEmail,
      action,
      entity,
      entityId,
      entityName,
      changes,
      description: description || generateDescription(action, entity, { entityName, adminName }),
      requiresApproval,
      status: requiresApproval ? "PENDING" : "AUTO_APPROVED",
      ipAddress,
      userAgent,
      metadata,
    });

    console.log(`✅ Activity logged: ${action} on ${entity} by ${adminName} - Status: ${logEntry.status}`);
    return logEntry;
  } catch (error) {
    console.error("❌ Error creating activity log:", error);
    throw error;
  }
};

/**
 * Generate human-readable description
 */
function generateDescription(action, entity, data) {
  const entityName = data.entityName || "item";
  const adminName = data.adminName || "Admin";

  const descriptions = {
    CREATE_PRODUCT: `${adminName} created a new product: "${entityName}"`,
    UPDATE_PRODUCT: `${adminName} updated product: "${entityName}"`,
    DELETE_PRODUCT: `${adminName} deleted product: "${entityName}"`,
    CREATE_CATEGORY: `${adminName} created a new category: "${entityName}"`,
    UPDATE_CATEGORY: `${adminName} updated category: "${entityName}"`,
    DELETE_CATEGORY: `${adminName} deleted category: "${entityName}"`,
    CREATE_PROMO: `${adminName} created a new promotion: "${entityName}"`,
    UPDATE_PROMO: `${adminName} updated promotion: "${entityName}"`,
    DELETE_PROMO: `${adminName} deleted promotion: "${entityName}"`,
    UPDATE_DELIVERY: `${adminName} updated delivery settings`,
    UPDATE_INVENTORY: `${adminName} updated inventory for: "${entityName}"`,
    UPDATE_LOYALTY_PROGRAM: `${adminName} updated loyalty program settings`,
    UPDATE_SETTINGS: `${adminName} updated system settings`,
  };

  return descriptions[action] || `${adminName} performed ${action} on ${entity}`;
}

/**
 * Middleware to check if user is super admin
 * ✅ FIXED: Now checks for lowercase "superadmin" role
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      error: "Unauthorized - Please login" 
    });
  }

  // ✅ FIXED: Check for lowercase role
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ 
      success: false,
      error: "Forbidden: Super admin access required" 
    });
  }

  next();
};

/**
 * Middleware to bypass approval for super admins
 * ✅ FIXED: Now checks for lowercase "superadmin" role
 */
export const bypassApprovalForSuperAdmin = (req, res, next) => {
  // ✅ FIXED: Check for lowercase role from your User model
  if (req.user?.role === "superadmin") {
    req.requiresApproval = false;
    console.log(`✅ Superadmin action - bypassing approval for ${req.user.name}`);
  } else if (req.user?.role === "admin") {
    req.requiresApproval = true;
    console.log(`⚠️  Admin action - requires approval for ${req.user.name}`);
  } else {
    req.requiresApproval = true;
  }
  next();
};

export default {
  logActivity,
  createActivityLog,
  requireSuperAdmin,
  bypassApprovalForSuperAdmin,
};