// backend/services/lalamoveService.js
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config(); 

class LalamoveService {
  constructor() {
    this.apiKey = process.env.LALAMOVE_API_KEY;
    this.apiSecret = process.env.LALAMOVE_API_SECRET;
    this.market = process.env.LALAMOVE_MARKET || 'PH_MNL';
    this.baseUrl = process.env.LALAMOVE_API_URL || 'https://rest.sandbox.lalamove.com';
    this.isSandbox = this.baseUrl.includes('sandbox');

    console.log('🚚 Lalamove Service initialized');
    console.log('📍 Market:', this.market);
    console.log('🌐 Base URL:', this.baseUrl);
  }

  generateSignature(method, path, timestamp, body) {
    const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawSignature)
      .digest('hex');
  }

  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '63' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('63')) {
      cleaned = '63' + cleaned;
    }
    return '+' + cleaned;
  }

  async getQuotation(pickupLocation, deliveryLocation, items = []) {
  const path = '/v3/quotations';
  const url = `${this.baseUrl}${path}`;
  const method = 'POST';
  const timestamp = new Date().getTime().toString();

  const deliveryPhone = this.formatPhoneNumber(deliveryLocation.contactPhone);

  const requestBody = {
    data: {
      serviceType: 'MOTORCYCLE',
      language: 'en_PH',
      stops: [
        {
          coordinates: {
            lat: String(pickupLocation.lat),
            lng: String(pickupLocation.lng)
          },
          address: pickupLocation.address
        },
        {
          coordinates: {
            lat: String(deliveryLocation.lat),
            lng: String(deliveryLocation.lng)
          },
          address: deliveryLocation.address
        }
      ],
      item: {
        quantity: String(items.length || 1),
        weight: 'LESS_THAN_3KG',
        categories: ['FOOD_DELIVERY'],
        handlingInstructions: []
      }
    }
  };

  const bodyString = JSON.stringify(requestBody);
  const signature = this.generateSignature(method, path, timestamp, bodyString);

  console.log('🔍 Lalamove V3 Request Debug:');
  console.log('URL:', url);
  console.log('Body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
        'Accept': 'application/json',
        'Market': this.market
      }
    });

    console.log('✅ Quotation success:', JSON.stringify(response.data, null, 2));
    
    // ✅ Extract the data properly
    const quotationData = response.data.data || response.data;
    
    // ✅ Extract stopIds from the response
    const stops = quotationData.stops || [];
    const pickupStopId = stops[0]?.stopId || stops[0]?.id;
    const deliveryStopId = stops[1]?.stopId || stops[1]?.id;
    
    console.log('📍 Extracted Stop IDs:', { pickupStopId, deliveryStopId });
    
    return {
      success: true,
      data: {
        ...quotationData,
        // ✅ Add these for easy access
        pickupStopId,
        deliveryStopId,
        quotationId: quotationData.quotationId || quotationData.id,
        priceBreakdown: {
          total: quotationData.priceBreakdown?.total || quotationData.totalPrice || 0,
          currency: quotationData.priceBreakdown?.currency || 'PHP',
          serviceType: quotationData.serviceType || 'MOTORCYCLE'
        },
        stops: stops
      }
    };
  } catch (error) {
    console.error('❌ Lalamove quotation error:');
    console.error('Status:', error.response?.status);
    console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
    
    let errorMessage = 'Failed to get quotation';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (Array.isArray(errors)) {
        errorMessage = errors.map(e => e.message || e.id || 'Unknown error').join(', ');
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error.response?.data
    };
  }
}

  async createOrder(orderData) {
    const path = '/v3/orders';
    const url = `${this.baseUrl}${path}`;
    const method = 'POST';
    const timestamp = new Date().getTime().toString();

    const requestBody = {
      data: {
        quotationId: orderData.quotationId,
        sender: {
          stopId: orderData.pickupStopId,
          name: orderData.senderName,
          phone: orderData.senderPhone
        },
        recipients: orderData.recipients.map(r => ({
          stopId: r.stopId,
          name: r.name,
          phone: r.phone,
          remarks: r.remarks || ''
        })),
        metadata: {
          partnerId: orderData.partnerOrderId || ''
        }
      }
    };

    const bodyString = JSON.stringify(requestBody);
    const signature = this.generateSignature(method, path, timestamp, bodyString);

    try {
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Accept': 'application/json',
          'Market': this.market
        }
      });

      console.log('✅ Order created:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Order creation error:', JSON.stringify(error.response?.data, null, 2));
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create order',
        details: error.response?.data
      };
    }
  }

 // services/lalamoveService.js

async getOrderDetails(orderId) {
  const path = `/v3/orders/${orderId}`;
  const url = `${this.baseUrl}${path}`;
  const method = 'GET';
  const timestamp = new Date().getTime().toString();

  const signature = this.generateSignature(method, path, timestamp, '');

  console.log('🔍 Fetching Lalamove order details:', orderId);

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
        'Accept': 'application/json',
        'Market': this.market
      }
    });

    console.log('✅ Lalamove order details response:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('❌ Lalamove get order error:', error.response?.status);
    console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
    
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to get order details',
    };
  }
}

  async cancelOrder(orderId) {
    const path = `/v3/orders/${orderId}`;
    const url = `${this.baseUrl}${path}`;
    const method = 'DELETE';
    const timestamp = new Date().getTime().toString();
    const signature = this.generateSignature(method, path, timestamp, '');

    try {
      const response = await axios.delete(url, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Accept': 'application/json',
          'Market': this.market
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Cancel order error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel order'
      };
    }
  }

  async getDriverLocation(orderId) {
    const path = `/v3/orders/${orderId}/drivers`;
    const url = `${this.baseUrl}${path}`;
    const method = 'GET';
    const timestamp = new Date().getTime().toString();
    const signature = this.generateSignature(method, path, timestamp, '');

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Accept': 'application/json',
          'Market': this.market
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Get driver location error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get driver location'
      };
    }
  }
}

export default new LalamoveService();