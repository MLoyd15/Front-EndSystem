import express from 'express'
import { addCategory, getCategories, updateCategory, deleteCategory  } from '../controlers/categoryController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/add', addCategory);
router.get('/', authMiddleware, getCategories);
router.put('/:id', authMiddleware, updateCategory);
router.delete('/:id', authMiddleware, deleteCategory);

export default router;