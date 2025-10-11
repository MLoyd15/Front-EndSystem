// backend/services/lalamoveService.js
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config(); 

// services/lalamoveService.js
import axios from 'axios';
import crypto from 'crypto';

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
    const path = this.isSandbox ? '/v3/quotations' : `/${this.market}/v3/quotations`;
    const url = `${this.baseUrl}${path}`;
    const method = 'POST';
    const timestamp = new Date().getTime().toString();

    const deliveryPhone = this.formatPhoneNumber(deliveryLocation.contactPhone);

    // ✅ FIXED: Proper structure with sender info
    const body = {
      data: { // ✅ Wrap in 'data' object
        scheduleAt: '',
        serviceType: 'MOTORCYCLE',
        specialRequests: [],
        language: 'en_PH',
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
        deliveries: [
          {
            toStop: 1, // Second stop (index 1)
            toContact: {
              name: deliveryLocation.contactName || 'Customer',
              phone: deliveryPhone
            },
            remarks: items.map(item => item.remarks).join(', ') || 'Order delivery'
          }
        ]
      }
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
          'Market': this.market // ✅ Add market to header
        }
      });

      console.log('✅ Quotation success:', JSON.stringify(response.data, null, 2));
      
      // ✅ Extract data from response
      const quotationData = response.data.data || response.data;
      
      return {
        success: true,
        data: quotationData
      };
    } catch (error) {
      console.error('❌ Lalamove quotation error:');
      console.error('Status:', error.response?.status);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Full Errors:', JSON.stringify(error.response?.data?.errors, null, 2));
      
      // ✅ Better error message
      let errorMessage = 'Failed to get quotation';
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (Array.isArray(errors)) {
          errorMessage = errors.map(e => {
            if (e.id === 'ERR_INSUFFICIENT_STOPS') {
              return 'Delivery distance is too short or stops are invalid. Minimum distance required.';
            }
            return e.message || e.id || 'Unknown error';
          }).join(', ');
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error.response?.data,
        validationErrors: error.response?.data?.errors
      };
    }
  }

  async createOrder(orderData) {
    const path = this.isSandbox ? '/v3/orders' : `/${this.market}/v3/orders`;
    const url = `${this.baseUrl}${path}`;
    const method = 'POST';
    const timestamp = new Date().getTime().toString();

    const body = {
      data: { // ✅ Wrap in 'data' object
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
      }
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
        data: response.data.data || response.data
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

  async getOrderDetails(orderId) {
    const path = this.isSandbox ? `/v3/orders/${orderId}` : `/${this.market}/v3/orders/${orderId}`;
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
        data: response.data.data || response.data
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
    const path = this.isSandbox ? `/v3/orders/${orderId}` : `/${this.market}/v3/orders/${orderId}`;
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
        data: response.data.data || response.data
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
    const path = this.isSandbox ? `/v3/orders/${orderId}/drivers` : `/${this.market}/v3/orders/${orderId}/drivers`;
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
        data: response.data.data || response.data
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