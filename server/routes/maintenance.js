// routes/maintenance.js
import express from 'express';
import authMiddleware, { requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// In-memory storage (replace with MongoDB model in production)
let maintenanceSettings = {
  enabled: false,
  message: 'We are currently performing scheduled maintenance. Please check back soon.',
  estimatedEnd: null,
  allowedRoles: ['admin', 'superadmin']
};

// Get maintenance status (public route)
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      enabled: maintenanceSettings.enabled,
      message: maintenanceSettings.message,
      estimatedEnd: maintenanceSettings.estimatedEnd,
      allowedRoles: maintenanceSettings.allowedRoles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance status' });
  }
});

// Check if user can bypass maintenance
router.get('/check-access', authMiddleware, (req, res) => {
  try {
    const userRole = req.user?.role;
    const canAccess = maintenanceSettings.allowedRoles.includes(userRole);
    
    res.json({
      success: true,
      maintenanceEnabled: maintenanceSettings.enabled,
      canAccess,
      message: maintenanceSettings.message,
      estimatedEnd: maintenanceSettings.estimatedEnd
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to check access' });
  }
});

// Toggle maintenance mode (super-admin only)
router.post('/toggle', authMiddleware, requireRole(['superadmin']), (req, res) => {
  try {
    maintenanceSettings = {
      ...maintenanceSettings,
      ...req.body
    };
    
    res.json({
      success: true,
      message: `Maintenance mode ${maintenanceSettings.enabled ? 'enabled' : 'disabled'}`,
      settings: maintenanceSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle maintenance mode' });
  }
});

// Update settings (super-admin only)
router.put('/settings', authMiddleware, requireRole(['superadmin']), (req, res) => {
  try {
    maintenanceSettings = {
      ...maintenanceSettings,
      message: req.body.message || maintenanceSettings.message,
      estimatedEnd: req.body.estimatedEnd || maintenanceSettings.estimatedEnd,
      allowedRoles: req.body.allowedRoles || maintenanceSettings.allowedRoles
    };
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: maintenanceSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

export default router;