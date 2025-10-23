import express from "express";
import { getStats } from "../controlers/adminController.js";
import { 
  listAdminBundles, 
  getAdminBundle, 
  createAdminBundle, 
  updateAdminBundle, 
  deleteAdminBundle,
  list as listMobileBundles
} from "../controlers/bundleController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/admin/stats
router.get("/stats", authMiddleware, getStats);

// Debug endpoint to test bundle APIs
router.get("/debug/bundles", authMiddleware, async (req, res) => {
  try {
    console.log('🧪 Testing Bundle Endpoints...');
    
    // Create mock request objects for testing
    const mockAdminReq = { user: req.user, query: {} };
    const mockMobileReq = { user: req.user, query: {} };
    
    let adminResult = null;
    let mobileResult = null;
    let adminError = null;
    let mobileError = null;
    
    // Test Admin API
    try {
      console.log('📋 Testing Admin API');
      const adminRes = {
        json: (data) => { adminResult = data; },
        status: (code) => ({ json: (data) => { adminResult = { status: code, ...data }; } })
      };
      await listAdminBundles(mockAdminReq, adminRes);
    } catch (error) {
      console.error('❌ Admin API Error:', error);
      adminError = error.message;
    }
    
    // Test Mobile API
    try {
      console.log('📱 Testing Mobile API');
      const mobileRes = {
        json: (data) => { mobileResult = data; },
        status: (code) => ({ json: (data) => { mobileResult = { status: code, ...data }; } })
      };
      await listMobileBundles(mockMobileReq, mobileRes);
    } catch (error) {
      console.error('❌ Mobile API Error:', error);
      mobileError = error.message;
    }
    
    // Compare results
    const adminBundles = adminResult?.bundles || [];
    const mobileBundles = mobileResult?.bundles || [];
    
    const comparison = {
      admin: {
        success: !adminError,
        error: adminError,
        bundleCount: adminBundles.length,
        bundles: adminBundles.map(b => ({ 
          name: b.name, 
          isActive: b.isActive,
          hasProductName: !!b.productName 
        }))
      },
      mobile: {
        success: !mobileError,
        error: mobileError,
        bundleCount: mobileBundles.length,
        bundles: mobileBundles.map(b => ({ 
          name: b.name, 
          isActive: b.isActive,
          hasProductName: !!b.productName 
        }))
      },
      analysis: {
        bothWorking: !adminError && !mobileError,
        countMatch: adminBundles.length === mobileBundles.length,
        suggestions: []
      }
    };
    
    // Add suggestions based on analysis
    if (adminError || mobileError) {
      comparison.analysis.suggestions.push("One or both APIs have errors - check server logs");
    }
    
    if (!adminError && !mobileError && adminBundles.length !== mobileBundles.length) {
      comparison.analysis.suggestions.push("Bundle counts don't match - check isActive filtering");
    }
    
    if (!adminError && !mobileError && adminBundles.length === mobileBundles.length) {
      comparison.analysis.suggestions.push("Both APIs working correctly with matching bundle counts");
    }
    
    console.log('✅ Bundle API Test Complete:', comparison);
    
    res.json({
      success: true,
      message: "Bundle API test completed",
      timestamp: new Date().toISOString(),
      ...comparison
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: "Debug test failed",
      error: error.message
    });
  }
});

// Admin Bundle Routes
router.get("/bundles", authMiddleware, listAdminBundles);
router.get("/bundles/:id", authMiddleware, getAdminBundle);
router.post("/bundles", authMiddleware, createAdminBundle);
router.put("/bundles/:id", authMiddleware, updateAdminBundle);
router.delete("/bundles/:id", authMiddleware, deleteAdminBundle);

export default router;
