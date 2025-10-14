// backend/routes/lalamove.js
import express from 'express';
import lalamoveService from '../services/lalamoveService.js';
import authMiddleware, { requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get delivery quotation
router.post('/quotation', async (req, res) => {
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
router.post('/order', async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData.quotationId) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID is required',
      });
    }

    console.log('📤 Creating order with data:', orderData);

    const result = await lalamoveService.createOrder(orderData);

    console.log('✅ Order created:', result);

    // ✅ If successful, update your delivery record
    if (result.success && req.body.deliveryId) {
      try {
        const lalamoveData = result.data.data || result.data;
        
        const updatedDelivery = await Delivery.findByIdAndUpdate(
          req.body.deliveryId,
          {
            $set: {
              'lalamove.orderId': lalamoveData.orderId,
              'lalamove.quotationId': lalamoveData.quotationId,
              'lalamove.pickupStopId': orderData.pickupStopId,
              'lalamove.deliveryStopId': orderData.deliveryStopId,
              'lalamove.shareLink': lalamoveData.shareLink,
              'lalamove.status': lalamoveData.status,
              'lalamove.priceBreakdown': lalamoveData.priceBreakdown,
              'lalamove.serviceType': lalamoveData.serviceType || 'MOTORCYCLE',
              status: 'assigned',
              thirdPartyProvider: 'Lalamove',
            }
          },
          { new: true }
        );
        
        console.log('✅ Delivery record updated:', updatedDelivery._id);
      } catch (updateError) {
        console.error('❌ Failed to update delivery record:', updateError);
        // Don't fail the whole request, just log it
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Create order route error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  }
});

// Get order status
// This should already exist from earlier
router.get('/order/:orderId', protect, async (req, res) => {
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
router.get('/order/:orderId/driver', async (req, res) => {
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
router.delete('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await lalamoveService.cancelOrder(orderId);

    // Update your delivery record
    if (result.success && req.body.deliveryId) {
      await Delivery.findByIdAndUpdate(req.body.deliveryId, {
        status: 'cancelled',
        'lalamove.status': 'CANCELLED',
        'lalamove.cancelReason': req.body.reason || 'Cancelled by admin'
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