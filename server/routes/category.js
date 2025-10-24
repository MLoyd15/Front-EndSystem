import express from 'express';
import { addCategory, getCategories, updateCategory, deleteCategory } from '../controlers/categoryController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);

// Admin routes (require authentication)
router.post('/add', authMiddleware, addCategory);
router.put('/:id', authMiddleware, updateCategory);
router.delete('/:id', authMiddleware, deleteCategory);

export default router;