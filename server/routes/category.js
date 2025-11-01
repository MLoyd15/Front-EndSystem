// routes/category.js
import express from 'express';
import { 
  addCategory, 
  getCategories, 
  updateCategory, 
  deleteCategory 
} from '../controlers/categoryController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { 
  bypassApprovalForSuperAdmin,
  createActivityLog 
} from '../middleware/activityLogMiddleware.js';

const router = express.Router();

// Optional auth middleware - allows both public and authenticated access
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    // If token exists, try to authenticate
    authMiddleware(req, res, next);
  } else {
    // If no token, continue as public access
    next();
  }
};

// Public routes with optional authentication
router.get('/', optionalAuth, getCategories);

// Admin routes with activity logging
router.post('/add', 
  authMiddleware, 
  bypassApprovalForSuperAdmin, 
  addCategory
);

router.put('/:id', 
  authMiddleware, 
  bypassApprovalForSuperAdmin, 
  updateCategory
);

router.delete('/:id', 
  authMiddleware, 
  bypassApprovalForSuperAdmin, 
  deleteCategory
);

export default router;