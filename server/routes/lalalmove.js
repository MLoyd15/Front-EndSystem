// backend/routes/lalamove.js
import express from 'express';
import lalamoveService from '../services/lalamoveService.js';
import authMiddleware, { requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get delivery quotation
router.post('/quotation', authMiddleware, async (req, res) => {
  try {
    const { pickupLocation, deliveryLocation, items } = req.body;

    if (!pickupLocation || !deliveryLocation) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and delivery locations are required',
      });
    }

    const result = await lalamoveService.getQuotation(
      pickupLocation,
      deliveryLocation,
      items
    );

    res.json(result);
  } catch (error) {
    console.error('Quotation route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quotation',
    });
  }
});

// Create Lalamove order
router.post('/order', authMiddleware, async (req, res) => {
  try {
    const orderData = req.body;

    // basic validation for required fields used to get quotation (adjust as required)
    const hasQuotationId = !!orderData.quotationId;
    if (!hasQuotationId) {
      // ensure we have minimal data to request a quotation
      if (!orderData.pickupStop || !orderData.deliveryStop) {
        return res.status(400).json({
          success: false,
          message: 'Missing pickupStop or deliveryStop required to request quotation server-side.'
        });
      }

      // Call Lalamove to create quotation server-side
      const quoteRes = await lalamoveService.getQuotation(
        orderData.pickupStop, // expect object with {lat,lng,address,contactPhone}
        orderData.deliveryStop,
        orderData.items || []
      );

      if (!quoteRes.success) {
        // return the detailed error so frontend can show it
        return res.status(400).json({
          success: false,
          message: 'Failed to obtain quotation from Lalamove',
          lalamoveError: quoteRes
        });
      }

      // try extracting quotation id from response in a robust way
      const qData = quoteRes.data || {};
      // Lalamove responses sometimes nest under data.data or data.quotationId etc.
      const quotationId =
        qData.data?.quotationId ||
        qData.data?.id ||
        qData.quotationId ||
        qData.id ||
        (typeof qData === 'string' ? qData : null);

      if (!quotationId) {
        // still no id -> return the whole response for debugging
        return res.status(500).json({
          success: false,
          message: 'Quotation returned but no quotationId found in Lalamove response',
          lalamoveResponse: quoteRes.data
        });
      }

      // attach it so createOrder below can continue
      orderData.quotationId = quotationId;
    }

    // At this point we have quotationId: call createOrder
    const result = await lalamoveService.createOrder(orderData);

    if (!result.success) {
      // forward Lalamove error details
      return res.status(400).json({
        success: false,
        message: 'Lalamove order creation failed',
        lalamoveError: result
      });
    }

    // If successful, update your delivery record
    if (result.success && req.body.deliveryId) {
      await Delivery.findByIdAndUpdate(req.body.deliveryId, {
        lalamoveOrderId: result.data?.data?.orderId || result.data?.orderId || result.data?.id,
        status: 'assigned',
        thirdPartyProvider: 'Lalamove'
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('Create order route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Get order status
router.get('/order/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await lalamoveService.getOrderDetails(orderId);
    res.json(result);
  } catch (error) {
    console.error('Get order route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order details',
    });
  }
});

// Get driver location
router.get('/order/:orderId/driver', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await lalamoveService.getDriverLocation(orderId);
    res.json(result);
  } catch (error) {
    console.error('Get driver location route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver location',
    });
  }
});

// Cancel order
router.delete('/order/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await lalamoveService.cancelOrder(orderId);

    // Update your delivery record
    if (result.success && req.body.deliveryId) {
      const { default: Delivery } = await import('../models/Delivery.js');
      await Delivery.findByIdAndUpdate(req.body.deliveryId, {
        status: 'cancelled',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Cancel order route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
    });
  }
});

export default router;