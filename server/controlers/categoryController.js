// controlers/categoryController.js
import Category from '../models/category.js';
import { createActivityLog } from '../middleware/activityLogMiddleware.js';

// Add Category with activity logging
export const addCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: name.trim().toLowerCase() 
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category already exists"
      });
    }

    // Create category (inactive if requires approval)
    const requiresApproval = req.requiresApproval !== false;
    
    const newCategory = new Category({
      name: name.trim(),
      description: description?.trim(),
      image,
      active: !requiresApproval // Active only if no approval needed
    });

    await newCategory.save();

    // ✅ Log the activity
    await createActivityLog({
      adminId: req.user._id,
      adminName: req.user.name,
      adminEmail: req.user.email,
      action: 'CREATE_CATEGORY',
      entity: 'CATEGORY',
      entityId: newCategory._id,
      entityName: newCategory.name,
      changes: {
        before: null,
        after: newCategory.toObject()
      },
      description: `Created new category: "${newCategory.name}"`,
      requiresApproval,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: requiresApproval 
        ? "Category created and pending approval" 
        : "Category created successfully",
      data: newCategory,
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
    const updates = req.body;

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

    // Apply updates (or store in pending state)
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
      entityName: originalCategory.name,
      changes: {
        before: originalData,
        after: updates
      },
      description: `Updated category: "${originalCategory.name}"`,
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
      data: originalCategory,
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
      entityName: category.name,
      changes: {
        before: category.toObject(),
        after: null
      },
      description: `Deleted category: "${category.name}"`,
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

// Get Categories (no logging needed)
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories"
    });
  }
};