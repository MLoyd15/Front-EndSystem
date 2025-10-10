// backend/routes/lalamove.js
const express = require('express');
const router = express.Router();
const lalamoveService = require('../services/lalamoveService');
const { protect } = require('../middleware/auth'); // Your auth middleware

// Get delivery quotation
router.post('/quotation', protect, async (req, res) => {
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
router.post('/order', protect, async (req, res) => {
  try {
    const orderData = req.body;

    if (!orderData.quotationId) {
      return res.status(400).json({
        success: false,
        message: 'Quotation ID is required',
      });
    }

    const result = await lalamoveService.createOrder(orderData);

    // If successful, update your delivery record
    if (result.success && req.body.deliveryId) {
      // Update your delivery document with Lalamove order ID
      const Delivery = require('../models/Delivery'); // Your model
      await Delivery.findByIdAndUpdate(req.body.deliveryId, {
        lalamoveOrderId: result.data.orderId,
        status: 'assigned',
        thirdPartyProvider: 'Lalamove',
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Create order route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
    });
  }
});

// Get order status
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
router.get('/order/:orderId/driver', protect, async (req, res) => {
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
router.delete('/order/:orderId', protect, async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await lalamoveService.cancelOrder(orderId);

    // Update your delivery record
    if (result.success && req.body.deliveryId) {
      const Delivery = require('../models/Delivery');
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

module.exports = router;