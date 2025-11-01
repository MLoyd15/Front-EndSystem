// controlers/categoryController.js
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

    // ✅ FIXED: Return in the format frontend expects
    res.json({
      success: true,
      categories: categories  // Frontend expects "categories" array
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
    if (!categoryName) {
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

    res.status(201).json({
      success: true,
      message: requiresApproval 
        ? "Category created and pending approval" 
        : "Category created successfully",
      category: newCategory,
      requiresApproval
    });

  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add category"
    });
  }
};

// Update Category with activity logging
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName, categoryDescription } = req.body;

    // Get original category
    const originalCategory = await Category.findById(id);
    
    if (!originalCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const requiresApproval = req.requiresApproval !== false;
    const originalData = originalCategory.toObject();

    // Apply updates
    const updates = {};
    if (categoryName) updates.categoryName = categoryName.trim();
    if (categoryDescription !== undefined) updates.categoryDescription = categoryDescription.trim();

    if (!requiresApproval) {
      // Super admin - apply immediately
      Object.assign(originalCategory, updates);
      await originalCategory.save();
    }

    // ✅ Log the activity
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'UPDATE_CATEGORY',
      entity: 'CATEGORY',
      entityId: originalCategory._id,
      entityName: originalCategory.categoryName,
      changes: {
        before: originalData,
        after: updates
      },
      description: `Updated category: "${originalCategory.categoryName}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        fieldsChanged: Object.keys(updates)
      }
    });

    res.json({
      success: true,
      message: requiresApproval
        ? "Category update pending approval"
        : "Category updated successfully",
      category: originalCategory,
      requiresApproval
    });

  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update category"
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

    if (!requiresApproval) {
      // Super admin - delete immediately
      await category.deleteOne();
    } else {
      // Mark as inactive pending deletion
      category.active = false;
      await category.save();
    }

    // ✅ Log the activity
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'DELETE_CATEGORY',
      entity: 'CATEGORY',
      entityId: category._id,
      entityName: category.categoryName,
      changes: {
        before: category.toObject(),
        after: null
      },
      description: `Deleted category: "${category.categoryName}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: requiresApproval
        ? "Category deletion pending approval"
        : "Category deleted successfully",
      requiresApproval
    });

  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete category"
    });
  }
};