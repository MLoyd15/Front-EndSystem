import React, { useState } from 'react';
import axios from 'axios';
import { Truck, MapPin, DollarSign, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { VITE_API_BASE } from '../config';

const LalamoveIntegration = ({ delivery, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState('');

  const API = VITE_API_BASE;
  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
  });

  const getQuotation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/lalamove/quotation`,
        {
          pickupLocation: {
            lat: 14.5995,
            lng: 120.9842,
            address: delivery.pickupLocation || 'Warehouse, Manila',
            contactName: 'GO AGRI TRADING',
            contactPhone: '+639123456789',
          },
          deliveryLocation: {
            lat: 14.4753,
            lng: 121.0431,
            address: delivery.deliveryAddress,
            contactName: delivery.customer?.name || 'Customer',
            contactPhone: delivery.customer?.phone || '+639000000000',
          },
          items: delivery.order?.items?.map((item) => ({
            remarks: `${item.productName} x${item.quantity}`,
          })) || [],
        },
        { headers: auth() }
      );

      if (response.data.success) {
        setQuotation(response.data.data);
        setStep(2);
      } else {
        setError(response.data.error || 'Failed to get quotation');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get quotation');
    } finally {
      setLoading(false);
    }
  };

  const bookDelivery = async () => {
    if (!quotation) return;
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/lalamove/order`,
        {
          deliveryId: delivery._id,
          quotationId: quotation.quotationId,
          pickupStopId: quotation.stops[0].stopId,
          senderName: 'GO AGRI TRADING',
          senderPhone: '+639123456789',
          recipients: [
            {
              stopId: quotation.stops[1].stopId,
              name: delivery.customer?.name || 'Customer',
              phone: delivery.customer?.phone || '+639000000000',
              remarks: `Order: ${delivery.order?.code || delivery._id}`,
            },
          ],
          partnerOrderId: delivery.order?.code || delivery._id,
        },
        { headers: auth() }
      );

      if (response.data.success) {
        setStep(3);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to book delivery');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to book delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 text-white">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Lalamove Booking</h2>
                <p className="text-sm text-gray-500">Third-party delivery service</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">✕</button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[{num:1,label:'Quotation'},{num:2,label:'Confirm'},{num:3,label:'Booked'}].map((s,idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num ? 'bg-gradient-to-br from-pink-500 to-red-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className="text-xs mt-1 text-gray-600">{s.label}</span>
                </div>
                {idx < 2 && <div className={`flex-1 h-1 mx-2 rounded ${step > s.num ? 'bg-pink-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Get Quotation */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Pickup Location</p>
                    <p className="text-sm text-gray-600">{delivery.pickupLocation || 'Warehouse, Manila'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600">{delivery.deliveryAddress}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={getQuotation}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Getting quotation...' : 'Get Quotation'}
              </button>
            </div>
          )}

          {/* Step 2: Confirm Booking */}
          {step === 2 && quotation && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-xl p-6 border border-pink-200">
                <h3 className="font-bold text-gray-900 mb-4">Quotation Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Delivery Fee
                    </span>
                    <span className="font-bold text-gray-900">
                      ₱{quotation.priceBreakdown?.total?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Estimated Time
                    </span>
                    <span className="font-medium text-gray-900">
                      {quotation.estimatedTime || '30-45 mins'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Service Type
                    </span>
                    <span className="font-medium text-gray-900">
                      {quotation.serviceType || 'Motorcycle'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={bookDelivery}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-red-600 disabled:opacity-50"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Successful!</h3>
              <p className="text-gray-600 mb-6">
                Your Lalamove delivery has been booked. The driver will be assigned shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LalamoveIntegration;