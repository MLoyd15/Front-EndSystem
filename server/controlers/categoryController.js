// controllers/categoryController.js
import Category from '../models/category.js';
import { createActivityLog } from '../middleware/activityLogMiddleware.js';

// Get Categories (no logging needed)
export const getCategories = async (req, res) => {
  try {
    let filter = {};
    
    // If user is authenticated (admin/superadmin), show all categories
    // If not authenticated (public), show only active categories
    if (!req.user) {
      filter.active = true;
    }
    
    const categories = await Category.find(filter)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      categories: categories
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
};

// Add Category with activity logging
export const addCategory = async (req, res) => {
  try {
    const { categoryName, categoryDescription } = req.body;

    // Validate input
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    // Check if category already exists (case-insensitive)
    const existingCategory = await Category.findOne({ 
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    // Determine if approval is required based on user role
    // req.requiresApproval is set by the bypassApprovalForSuperAdmin middleware
    const requiresApproval = req.requiresApproval !== false;
    
    const newCategory = new Category({
      categoryName: categoryName.trim(),
      categoryDescription: categoryDescription?.trim() || "",
      active: !requiresApproval // Active immediately if superadmin, inactive if admin (pending approval)
    });

    await newCategory.save();

    // Log the activity for approval tracking
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'CREATE_CATEGORY',
      entity: 'CATEGORY',
      entityId: newCategory._id,
      entityName: newCategory.categoryName,
      changes: {
        before: null,
        after: newCategory.toObject()
      },
      description: `Created new category: "${newCategory.categoryName}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // ✅ FIXED: Always return success: true when category is created
    return res.status(201).json({
      success: true,
      message: requiresApproval 
        ? "Category created and pending approval" 
        : "Category created successfully",
      category: newCategory,
      requiresApproval
    });

  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to add category"
    });
  }
};

// Update Category with activity logging
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, categoryDescription } = req.body;

    // Validate input
    if (!categoryName || !categoryName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    // Get original category
    const originalCategory = await Category.findById(id);
    
    if (!originalCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Check if another category with the same name exists (excluding current one)
    const duplicateCategory = await Category.findOne({ 
      categoryName: { $regex: new RegExp(`^${categoryName.trim()}$`, 'i') },
      _id: { $ne: id }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists"
      });
    }

    const requiresApproval = req.requiresApproval !== false;
    const originalData = originalCategory.toObject();

    // Prepare updates
    const updates = {
      categoryName: categoryName.trim(),
      categoryDescription: categoryDescription?.trim() || ""
    };

    if (!requiresApproval) {
      // Super admin - apply immediately
      originalCategory.categoryName = updates.categoryName;
      originalCategory.categoryDescription = updates.categoryDescription;
      await originalCategory.save();
    }

    // Log the activity
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'UPDATE_CATEGORY',
      entity: 'CATEGORY',
      entityId: originalCategory._id,
      entityName: originalCategory.categoryName,
      changes: {
        before: {
          categoryName: originalData.categoryName,
          categoryDescription: originalData.categoryDescription
        },
        after: updates
      },
      description: `Updated category: "${originalData.categoryName}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        fieldsChanged: Object.keys(updates)
      }
    });

    return res.json({
      success: true,
      message: requiresApproval
        ? "Category update pending approval"
        : "Category updated successfully",
      category: originalCategory,
      requiresApproval
    });

  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update category"
    });
  }
};

// Delete Category with activity logging
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const requiresApproval = req.requiresApproval !== false;
    const categoryData = category.toObject();

    if (!requiresApproval) {
      // Super admin - delete immediately
      await category.deleteOne();
    } else {
      // Admin - mark as inactive pending deletion approval
      category.active = false;
      await category.save();
    }

    // Log the activity
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'DELETE_CATEGORY',
      entity: 'CATEGORY',
      entityId: category._id,
      entityName: categoryData.categoryName,
      changes: {
        before: categoryData,
        after: null
      },
      description: `Deleted category: "${categoryData.categoryName}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.json({
      success: true,
      message: requiresApproval
        ? "Category deletion pending approval"
        : "Category deleted successfully",
      requiresApproval
    });

  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete category"
    });
  }
};

export default {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
};