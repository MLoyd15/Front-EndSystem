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
    
    // ✅ Check if using sandbox
    this.isSandbox = this.baseUrl.includes('sandbox');

    console.log('🚚 Lalamove Service initialized');
    console.log('📍 Market:', this.market);
    console.log('🌐 Base URL:', this.baseUrl);
    console.log('🧪 Sandbox Mode:', this.isSandbox);
  }

  generateSignature(method, path, timestamp, body) {
    const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawSignature)
      .digest('hex');
  }

  async getQuotation(pickupLocation, deliveryLocation, items = []) {
    // ✅ FIXED: Sandbox uses different path structure
    const path = this.isSandbox 
      ? '/v3/quotations'  // Sandbox: no market in path
      : `/${this.market}/v3/quotations`; // Production: market in path
    
    const url = `${this.baseUrl}${path}`;
    const method = 'POST';
    const timestamp = new Date().getTime().toString();

    const body = {
      scheduleAt: '',
      serviceType: 'MOTORCYCLE',
      specialRequests: [],
      language: 'en_PH',
      market: this.market, // ✅ Market goes in body for sandbox
      stops: [
        {
          location: {
            lat: String(pickupLocation.lat),
            lng: String(pickupLocation.lng)
          },
          addresses: {
            en_PH: {
              displayString: pickupLocation.address,
              country: 'PH'
            }
          }
        },
        {
          location: {
            lat: String(deliveryLocation.lat),
            lng: String(deliveryLocation.lng)
          },
          addresses: {
            en_PH: {
              displayString: deliveryLocation.address,
              country: 'PH'
            }
          }
        }
      ],
      deliveries: items.map((item, index) => ({
        toStop: index + 1,
        toContact: {
          name: deliveryLocation.contactName,
          phone: deliveryLocation.contactPhone
        },
        remarks: item.remarks || ''
      }))
    };

    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(method, path, timestamp, bodyString);

    console.log('🔍 Lalamove Request Debug:');
    console.log('URL:', url);
    console.log('Path:', path);
    console.log('Market:', this.market);
    console.log('Body:', JSON.stringify(body, null, 2));

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `hmac ${this.apiKey}:${timestamp}:${signature}`,
          'Accept': 'application/json',
          'Market': this.market // ✅ Also include in header
        }
      });

      console.log('✅ Quotation success:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Lalamove quotation error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to get quotation',
        details: error.response?.data
      };
    }
  }

  async createOrder(orderData) {
    const path = this.isSandbox 
      ? '/v3/orders'
      : `/${this.market}/v3/orders`;
    
    const url = `${this.baseUrl}${path}`;
    const method = 'POST';
    const timestamp = new Date().getTime().toString();

    const body = {
      market: this.market, // ✅ Include market in body
      quotationId: orderData.quotationId,
      sender: {
        stopId: orderData.pickupStopId,
        name: orderData.senderName,
        phone: orderData.senderPhone
      },
      recipients: orderData.recipients.map((recipient) => ({
        stopId: recipient.stopId,
        name: recipient.name,
        phone: recipient.phone,
        remarks: recipient.remarks || ''
      })),
      isPODEnabled: true,
      partner: orderData.partnerOrderId || ''
    };

    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(method, path, timestamp, bodyString);

    try {
      const response = await axios.post(url, body, {
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
      console.error('❌ Order creation error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create order',
        details: error.response?.data
      };
    }
  }

  async getOrderDetails(orderId) {
    const path = this.isSandbox 
      ? `/v3/orders/${orderId}`
      : `/${this.market}/v3/orders/${orderId}`;
    
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
      console.error('❌ Get order error:', error.response?.data || error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get order details'
      };
    }
  }

  async cancelOrder(orderId) {
    const path = this.isSandbox 
      ? `/v3/orders/${orderId}`
      : `/${this.market}/v3/orders/${orderId}`;
    
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
    const path = this.isSandbox 
      ? `/v3/orders/${orderId}/drivers`
      : `/${this.market}/v3/orders/${orderId}/drivers`;
    
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