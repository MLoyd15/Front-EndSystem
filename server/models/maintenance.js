import mongoose from 'mongoose';

// Define the schema (structure) for maintenance documents
const maintenanceSchema = new mongoose.Schema({
  // Is maintenance mode ON or OFF?
  enabled: {
    type: Boolean,        // Only accepts true/false
    default: false,       // Default is OFF (false)
    required: true        // This field is mandatory
  },
  
  // Message shown to users during maintenance
  message: {
    type: String,         // Text field
    default: 'We are currently performing scheduled maintenance. Please check back soon.',
    maxlength: 500,       // Maximum 500 characters
    trim: true            // Remove whitespace from start/end
  },
  
  // When will maintenance end?
  estimatedEnd: {
    type: Date,           // Stores date and time
    default: null         // null = no estimated end time
  },
  
  // Which roles can bypass maintenance?
  allowedRoles: [{        // Array of strings
    type: String,
    enum: ['admin', 'superadmin'],  // Only these values allowed
    default: ['admin', 'superadmin']
  }],
  
  // Who last changed the settings?
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,  // Reference to User collection
    ref: 'User',                            // Links to User model
    default: null
  },
  
  // Reason for enabling maintenance (optional)
  reason: {
    type: String,
    maxlength: 200,
    default: ''
  }
}, {
  // Automatically add createdAt and updatedAt fields
  timestamps: true
});

// ============================================================================
// SINGLETON PATTERN - Ensures only ONE maintenance document exists
// ============================================================================

/**
 * getInstance() - Get the one and only maintenance document
 * If it doesn't exist, create it
 */
maintenanceSchema.statics.getInstance = async function() {
  // Try to find existing maintenance document
  let maintenance = await this.findOne();
  
  // If none exists, create a new one with defaults
  if (!maintenance) {
    maintenance = await this.create({
      enabled: false,
      message: 'We are currently performing scheduled maintenance. Please check back soon.',
      allowedRoles: ['admin', 'superadmin']
    });
  }
  
  return maintenance;
};

// Export the model
export default mongoose.model('Maintenance', maintenanceSchema);