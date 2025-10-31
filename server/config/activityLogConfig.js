/**
 * Activity Log Configuration
 * Customize behavior of the activity log system
 */

export const activityLogConfig = {
  /**
   * Approval Requirements
   * Define which actions require approval
   */
  approvalRules: {
    // Products
    CREATE_PRODUCT: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
      // Optional: Add custom validation
      customRule: (req) => {
        // Example: No approval needed for products under $100
        return req.body.price > 100;
      }
    },
    UPDATE_PRODUCT: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
      // Example: Only require approval for price changes
      customRule: (req) => {
        return req.body.hasOwnProperty('price');
      }
    },
    DELETE_PRODUCT: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },

    // Categories
    CREATE_CATEGORY: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },
    UPDATE_CATEGORY: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },
    DELETE_CATEGORY: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },

    // Promotions
    CREATE_PROMO: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
      // Example: Require approval for discounts over 50%
      customRule: (req) => {
        return req.body.discountPercent > 50;
      }
    },
    UPDATE_PROMO: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },
    DELETE_PROMO: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },

    // Inventory
    UPDATE_INVENTORY: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
      // Example: No approval needed for small adjustments
      customRule: (req) => {
        return Math.abs(req.body.adjustment) > 100;
      }
    },

    // Delivery Settings
    UPDATE_DELIVERY: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },

    // System Settings
    UPDATE_SETTINGS: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },

    // Loyalty Program
    UPDATE_LOYALTY_PROGRAM: {
      requiresApproval: true,
      bypassForSuperAdmin: true,
    },
  },

  /**
   * Notification Settings
   * Configure when and how to notify super admins
   */
  notifications: {
    enabled: true,
    
    // Send email notifications
    email: {
      enabled: true,
      // Email on every pending approval
      onPendingApproval: true,
      // Digest email for multiple approvals
      digestEnabled: true,
      digestInterval: '1 hour', // '15 minutes', '1 hour', '4 hours', 'daily'
      digestMinimum: 5, // Send digest only if at least 5 pending
    },

    // Push notifications (if implemented)
    push: {
      enabled: false,
      onPendingApproval: true,
    },

    // Slack notifications (if implemented)
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: '#admin-approvals',
      mentionUsers: ['@superadmin1', '@superadmin2'],
    },

    // SMS notifications (if implemented)
    sms: {
      enabled: false,
      onCriticalActions: true, // Only for DELETE actions
      phoneNumbers: ['+1234567890'],
    },
  },

  /**
   * Auto-Approval Settings
   * Define conditions for automatic approval
   */
  autoApproval: {
    // Auto-approve after certain time if no review
    timeBasedAutoApproval: {
      enabled: false,
      delayHours: 24, // Auto-approve after 24 hours
      excludeActions: ['DELETE_PRODUCT', 'DELETE_CATEGORY'], // Never auto-approve these
    },

    // Auto-approve based on admin reputation
    reputationBased: {
      enabled: false,
      minApprovedActions: 50, // Admin needs 50 approved actions
      minApprovalRate: 0.95, // 95% approval rate
    },

    // Auto-approve for specific admins
    trustedAdmins: {
      enabled: false,
      adminIds: [], // Array of trusted admin IDs
    },
  },

  /**
   * Data Retention
   * Configure how long to keep logs
   */
  retention: {
    // Archive old logs
    archiveAfterDays: 180, // 6 months
    
    // Delete very old logs
    deleteAfterDays: 730, // 2 years
    
    // Keep rejected logs shorter
    deleteRejectedAfterDays: 90, // 3 months
  },

  /**
   * Security Settings
   */
  security: {
    // Log IP addresses
    logIpAddress: true,
    
    // Log user agent
    logUserAgent: true,
    
    // Rate limiting for approvals
    rateLimiting: {
      enabled: true,
      maxApprovalsPerMinute: 10,
      maxApprovalsPerHour: 100,
    },

    // Require 2FA for approvals
    require2FA: {
      enabled: false,
      forActions: ['DELETE_PRODUCT', 'DELETE_CATEGORY'],
    },

    // Audit log encryption
    encryption: {
      enabled: false,
      sensitiveFields: ['changes', 'metadata'],
    },
  },

  /**
   * UI Settings
   */
  ui: {
    // Pagination
    defaultPageSize: 20,
    maxPageSize: 100,

    // Polling interval for pending approvals (in ms)
    pollingInterval: 30000, // 30 seconds

    // Show notification badge
    showNotificationBadge: true,

    // Show banner on dashboard
    showBannerOnDashboard: true,

    // Colors for different statuses
    statusColors: {
      PENDING: '#FFC107',
      APPROVED: '#4CAF50',
      REJECTED: '#F44336',
      AUTO_APPROVED: '#2196F3',
    },
  },

  /**
   * Webhook Settings
   * Send webhooks on certain events
   */
  webhooks: {
    enabled: false,
    events: {
      onPendingApproval: {
        enabled: false,
        url: process.env.WEBHOOK_PENDING_URL,
      },
      onApproved: {
        enabled: false,
        url: process.env.WEBHOOK_APPROVED_URL,
      },
      onRejected: {
        enabled: false,
        url: process.env.WEBHOOK_REJECTED_URL,
      },
    },
    // Retry failed webhooks
    retryPolicy: {
      enabled: true,
      maxRetries: 3,
      retryDelayMs: 5000,
    },
  },

  /**
   * Integration Settings
   */
  integrations: {
    // Integrate with audit services
    auditService: {
      enabled: false,
      provider: 'custom', // 'custom', 'papertrail', 'loggly'
      endpoint: process.env.AUDIT_SERVICE_URL,
    },

    // Export logs
    export: {
      enabled: true,
      formats: ['json', 'csv', 'pdf'],
      scheduleDaily: false,
      emailTo: [],
    },
  },

  /**
   * Performance Settings
   */
  performance: {
    // Use caching for frequently accessed logs
    caching: {
      enabled: true,
      cachePendingApprovals: true,
      ttlSeconds: 300, // 5 minutes
    },

    // Database indexes (already defined in model)
    indexing: {
      enabled: true,
    },

    // Batch processing for bulk operations
    batchProcessing: {
      enabled: true,
      batchSize: 100,
    },
  },

  /**
   * Custom Handlers
   * Define custom behavior for specific actions
   */
  customHandlers: {
    // Before logging
    beforeLog: async (logData) => {
      // Add custom logic here
      // Example: Add additional metadata
      logData.metadata = {
        ...logData.metadata,
        timestamp: new Date().toISOString(),
      };
      return logData;
    },

    // After approval
    afterApproval: async (log) => {
      // Add custom logic here
      // Example: Send thank you email to admin
      console.log(`Action approved: ${log._id}`);
    },

    // After rejection
    afterRejection: async (log) => {
      // Add custom logic here
      // Example: Notify admin of rejection
      console.log(`Action rejected: ${log._id}`);
    },

    // Custom approval logic
    shouldRequireApproval: (action, req) => {
      // Example: Dynamic approval based on time
      const hour = new Date().getHours();
      const isBusinessHours = hour >= 9 && hour < 17;
      
      // Require approval outside business hours
      return !isBusinessHours;
    },
  },

  /**
   * Development/Testing Settings
   */
  development: {
    // Bypass all approvals in development
    bypassAllApprovals: process.env.NODE_ENV === 'development',
    
    // Log detailed information
    verboseLogging: process.env.NODE_ENV === 'development',
    
    // Use mock data
    useMockData: false,
  },
};

/**
 * Helper function to check if action requires approval
 */
export const requiresApproval = (action, req) => {
  const rule = activityLogConfig.approvalRules[action];
  
  if (!rule) return false;

  // Check if super admin bypass is enabled
  if (rule.bypassForSuperAdmin && req.user?.role === 'SUPER_ADMIN') {
    return false;
  }

  // Check custom rule if exists
  if (rule.customRule && typeof rule.customRule === 'function') {
    return rule.customRule(req);
  }

  return rule.requiresApproval;
};

/**
 * Helper function to get notification settings for action
 */
export const getNotificationSettings = (action) => {
  return activityLogConfig.notifications;
};

/**
 * Helper function to validate configuration
 */
export const validateConfig = () => {
  const errors = [];

  // Validate required fields
  if (activityLogConfig.notifications.email.enabled && 
      !process.env.EMAIL_SERVICE_CONFIGURED) {
    errors.push('Email notifications enabled but email service not configured');
  }

  if (activityLogConfig.webhooks.enabled &&
      !activityLogConfig.webhooks.events.onPendingApproval.url) {
    errors.push('Webhooks enabled but no URL configured');
  }

  if (errors.length > 0) {
    console.warn('Activity Log Configuration Warnings:', errors);
  }

  return errors.length === 0;
};

// Validate on import
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export default activityLogConfig;