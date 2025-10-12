// components/LalamoveIntegration.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';
import { MapPin, Truck, X, Loader, AlertCircle, CheckCircle2, Package } from 'lucide-react';

const LalamoveIntegration = ({ delivery, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [step, setStep] = useState('quotation');

  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
    'Content-Type': 'application/json'
  });

  const getQuotation = async () => {
    setLoading(true);
    setError(null);

    try {
      const pickupLocation = {
        lat: delivery.pickupCoordinates?.lat || 14.5995,
        lng: delivery.pickupCoordinates?.lng || 120.9842,
        address: delivery.pickupLocation || 'Warehouse, Manila, Philippines',
        contactName: 'GO AGRI TRADING',
        contactPhone: '+639123456789'
      };

      const deliveryLocation = {
        lat: delivery.deliveryCoordinates?.lat || 14.5547,
        lng: delivery.deliveryCoordinates?.lng || 121.0244,
        address: delivery.deliveryAddress || 'Customer Address, Manila, Philippines',
        contactName: delivery.customer?.name || delivery.order?.user?.name || 'Customer',
        contactPhone: delivery.customer?.phone || delivery.order?.user?.phone || '+639987654321'
      };

      const items = delivery.order?.items?.map((item) => ({
        remarks: `${item.name} - Qty: ${item.quantity}`
      })) || [{ remarks: 'Order items' }];

      const response = await axios.post(
        `${VITE_API_BASE}/lalamove/quotation`,
        {
          pickupLocation,
          deliveryLocation,
          items
        },
        { headers: auth() }
      );

      console.log('📦 Quotation response:', response.data);

      if (response.data.success) {
        const quotationData = response.data.data;
        
        // ✅ Check if we have the required stopIds
        if (!quotationData.pickupStopId || !quotationData.deliveryStopId) {
          throw new Error('Missing stop IDs from quotation response. Please check the API response structure.');
        }
        
        setQuotation(quotationData);
        setStep('confirm');
      } else {
        throw new Error(response.data.error || 'Failed to get quotation');
      }
    } catch (err) {
      console.error('Quotation error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to get quotation. Please check the delivery details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async () => {
    if (!quotation || !quotation.pickupStopId || !quotation.deliveryStopId) {
      setError('Missing required stop IDs. Cannot create order.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        quotationId: quotation.quotationId,
        pickupStopId: quotation.pickupStopId,
        senderName: 'GO AGRI TRADING',
        senderPhone: '+639123456789',
        recipients: [
          {
            stopId: quotation.deliveryStopId,
            name: delivery.customer?.name || delivery.order?.user?.name || 'Customer',
            phone: delivery.customer?.phone || delivery.order?.user?.phone || '+639987654321',
            remarks: `Order #${String(delivery.order?._id || delivery._id).slice(-6).toUpperCase()}`
          }
        ],
        partnerOrderId: String(delivery._id),
        deliveryId: delivery._id
      };

      console.log('📤 Creating order with data:', orderData);

      const response = await axios.post(
        `${VITE_API_BASE}/lalamove/order`,
        orderData,
        { headers: auth() }
      );

      if (response.data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create Lalamove order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getQuotation();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Lalamove Booking</h2>
                <p className="text-sm text-pink-100">Third-party delivery service</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader className="w-12 h-12 text-pink-500 animate-spin mb-4" />
              <p className="text-slate-600">
                {step === 'quotation' ? 'Getting quotation...' : 'Creating order...'}
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Booking Successful!
              </h3>
              <p className="text-slate-600 text-center">
                Your Lalamove delivery has been booked successfully.
              </p>
            </div>
          )}

          {/* Quotation Details */}
          {!loading && step === 'confirm' && quotation && (
            <>
              <div className="space-y-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">Pickup Location</h3>
                      <p className="text-sm text-green-700">
                        {delivery.pickupLocation || 'Warehouse, Manila'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">Delivery Address</h3>
                      <p className="text-sm text-red-700">
                        {delivery.deliveryAddress || 'Customer Address'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-start gap-3 mb-4">
                  <Package className="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-2">Quotation Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Service Type:</span>
                        <span className="font-medium text-slate-900">
                          {quotation.priceBreakdown?.serviceType || 'MOTORCYCLE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Estimated Time:</span>
                        <span className="font-medium text-slate-900">30-45 mins</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-600 font-semibold">Total Price:</span>
                        <span className="font-bold text-lg text-pink-600">
                          ₱{(quotation.priceBreakdown?.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && step === 'confirm' && (
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-2xl">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition"
              >
                Back
              </button>
              <button
                onClick={createOrder}
                disabled={loading || !quotation?.pickupStopId || !quotation?.deliveryStopId}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-600 hover:to-red-600 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {error && step === 'quotation' && (
          <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6 rounded-b-2xl">
            <button
              onClick={getQuotation}
              disabled={loading}
              className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-600 hover:to-red-600 transition shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LalamoveIntegration;