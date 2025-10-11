// backend/services/lalamoveService.js
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config(); 

class LalamoveService {
  constructor() {
    this.apiKey = process.env.LALAMOVE_API_KEY;
    this.apiSecret = process.env.LALAMOVE_API_SECRET;
    this.market = process.env.LALAMOVE_MARKET || 'PH';
    this.baseUrl = process.env.LALAMOVE_API_URL || 'https://rest.lalamove.com';
  }

  // Generate signature for API authentication
generateSignature(method, path, timestamp, body) {
  if (!this.apiSecret) {
    throw new Error("Lalamove API secret not configured (LALAMOVE_API_SECRET)");
  }
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  return crypto.createHmac('sha256', String(this.apiSecret)).update(rawSignature).digest('hex');
}

  // Get quotation for delivery
  // Get quotation for delivery
async getQuotation(pickupLocation, deliveryLocation, items = []) {
  const path = `/v3/quotations`;
  const url = `${this.baseUrl}${path}`;
  const method = 'POST';
  const timestamp = new Date().getTime().toString();

  const body = {
    serviceType: 'MOTORCYCLE',
    specialRequests: [],
    language: 'en_PH',
    stops: [
      {
        coordinates: {
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
        },
        addresses: {
          en_PH: {
            displayString: pickupLocation.address,
            country: 'PH',
          },
        },
      },
      {
        coordinates: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        },
        addresses: {
          en_PH: {
            displayString: deliveryLocation.address,
            country: 'PH',
          },
        },
      },
    ],
    deliveries: items.map((item, index) => ({
      toStop: index + 1,
      toContact: {
        name: deliveryLocation.contactName,
        phone: deliveryLocation.contactPhone,
      },
      remarks: item.remarks || '',
    })),
  };

  const bodyString = JSON.stringify(body);
  const signature = this.generateSignature(method, path, timestamp, bodyString);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
        'X-LLM-Country': this.market,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Lalamove quotation error:', error.response?.data || error);
    return {
      success: false,
      error: error.response?.data?.message || 'Failed to get quotation',
    };
  }
}

  // Get order details
  async getOrderDetails(orderId) {
    const path = `/v3/orders/${orderId}`;
    const url = `${this.baseUrl}${path}`;
    const method = 'GET';
    const timestamp = new Date().getTime().toString();

    const signature = this.generateSignature(method, path, timestamp, '');

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'X-LLM-Country': this.market,
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Lalamove get order error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get order details',
      };
    }
  }

  // Cancel order
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
          'X-LLM-Country': this.market,
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Lalamove cancel order error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel order',
      };
    }
  }

  // Get driver location
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
          'X-LLM-Country': this.market,
        },
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('Lalamove get driver location error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get driver location',
      };
    }
  }
}

// ✅ Export as ES module default
export default new LalamoveService();