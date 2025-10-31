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

// Public routes
router.get('/', getCategories);

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