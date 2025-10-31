import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE_PRODUCT",
        "UPDATE_PRODUCT",
        "DELETE_PRODUCT",
        "CREATE_CATEGORY",
        "UPDATE_CATEGORY",
        "DELETE_CATEGORY",
        "CREATE_PROMO",
        "UPDATE_PROMO",
        "DELETE_PROMO",
        "UPDATE_DELIVERY",
        "UPDATE_INVENTORY",
        "UPDATE_LOYALTY_PROGRAM",
        "UPDATE_SETTINGS",
        "OTHER",
      ],
    },

    // Details of the action
    entity: {
      type: String,
      required: true,
      enum: ["PRODUCT", "CATEGORY", "PROMO", "DELIVERY", "INVENTORY", "LOYALTY", "SETTINGS", "OTHER"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    entityName: {
      type: String,
    },

    // What changed
    changes: {
      type: mongoose.Schema.Types.Mixed, // Stores before/after values
    },
    description: {
      type: String,
      required: true,
    },

    // Approval workflow
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "AUTO_APPROVED"],
      default: "PENDING",
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },

    // Approval details
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedByName: {
      type: String,
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
    },

    // Metadata
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed, // Additional data
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
activityLogSchema.index({ adminId: 1, createdAt: -1 });
activityLogSchema.index({ status: 1, createdAt: -1 });
activityLogSchema.index({ entity: 1, entityId: 1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

// Virtual for easier status checking
activityLogSchema.virtual("isPending").get(function () {
  return this.status === "PENDING";
});

activityLogSchema.virtual("isApproved").get(function () {
  return this.status === "APPROVED" || this.status === "AUTO_APPROVED";
});

export default mongoose.models.ActivityLog || 
  mongoose.model("ActivityLog", activityLogSchema);