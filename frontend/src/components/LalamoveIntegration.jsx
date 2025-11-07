// components/LalamoveIntegration.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';
import { MapPin, Truck, X, Loader, AlertCircle, CheckCircle2, Package, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for pickup and delivery
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map click handler component
function LocationMarker({ onLocationSelect, markerType }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng, markerType);
    },
  });
  return null;
}

const LalamoveIntegration = ({ delivery, onClose, onSuccess }) => {
  const [step, setStep] = useState('map'); // 'map' | 'quotation' | 'confirm' | 'success'
  const [loading, setLoading] = useState(false);
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState('');
  const [selectingMarker, setSelectingMarker] = useState('pickup'); // 'pickup' | 'delivery'
  
  // Default to Manila area
  const [pickupLocation, setPickupLocation] = useState({
    lat: 14.5995,
    lng: 120.9842,
    address: 'Warehouse, Manila',
  });
  
  const [deliveryLocation, setDeliveryLocation] = useState({
    lat: 14.5547,
    lng: 121.0244,
    address: delivery.deliveryAddress || 'Customer Address',
  });

  const API = VITE_API_BASE;
  const auth = () => ({
    Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
    'Content-Type': 'application/json'
  });

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      console.error('Geocoding error:', err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const handleMapClick = async (latlng, markerType) => {
    const address = await reverseGeocode(latlng.lat, latlng.lng);
    
    const location = {
      lat: latlng.lat,
      lng: latlng.lng,
      address: address,
    };

    if (markerType === 'pickup') {
      setPickupLocation(location);
    } else {
      setDeliveryLocation(location);
    }
  };

  const getQuotation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/lalamove/quotation`,
        {
          pickupLocation: {
            lat: pickupLocation.lat,
            lng: pickupLocation.lng,
            address: pickupLocation.address,
            contactName: 'GO AGRI TRADING',
            contactPhone: '+639123456789',
          },
          deliveryLocation: {
            lat: deliveryLocation.lat,
            lng: deliveryLocation.lng,
            address: deliveryLocation.address,
            contactName: delivery.customer?.name || 'Customer',
            contactPhone: delivery.customer?.phone || '+639171234567',
          },
          items: delivery.order?.items?.map((item) => ({
            remarks: `${item.productName || item.name} x${item.quantity}`,
          })) || [{ remarks: 'Order items' }],
        },
        { headers: auth() }
      );

      console.log('📦 Quotation response:', response.data);

      if (response.data.success) {
        const quotationData = response.data.data;
        
        // ✅ Check if we have the required stopIds
        if (!quotationData.pickupStopId || !quotationData.deliveryStopId) {
          throw new Error('Missing stop IDs from quotation response');
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

  const bookDelivery = async () => {
    if (!quotation || !quotation.pickupStopId || !quotation.deliveryStopId) {
      setError('Missing required stop IDs. Cannot create order.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderData = {
        deliveryId: delivery._id, // ✅ Added deliveryId
        quotationId: quotation.quotationId,
        pickupStopId: quotation.pickupStopId, // ✅ Use extracted stopId
        senderName: 'GO AGRI TRADING',
        senderPhone: '+639123456789',
        recipients: [
          {
            stopId: quotation.deliveryStopId, // ✅ Use extracted stopId
            name: delivery.customer?.name || 'Customer',
            phone: delivery.customer?.phone || '+639171234567',
            remarks: `Order #${String(delivery.order?._id || delivery._id).slice(-6).toUpperCase()}`,
          },
        ],
        partnerOrderId: String(delivery._id),
      };

      console.log('📤 Creating order with data:', orderData);

      const response = await axios.post(
        `${API}/lalamove/order`,
        orderData,
        { headers: auth() }
      );

      if (response.data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Failed to book delivery');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to book delivery');
    } finally {
      setLoading(false);
    }
  };

  // Get user's current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const address = await reverseGeocode(latitude, longitude);
          
          if (selectingMarker === 'pickup') {
            setPickupLocation({ lat: latitude, lng: longitude, address });
          } else {
            setDeliveryLocation({ lat: latitude, lng: longitude, address });
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Unable to get your current location');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-pink-500 to-red-500 text-white p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Lalamove Booking</h2>
                <p className="text-sm text-pink-100">
                  {step === 'map' && 'Select pickup and delivery locations'}
                  {step === 'confirm' && 'Review and confirm booking'}
                  {step === 'success' && 'Booking successful!'}
                </p>
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
        <div className="p-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Map View */}
          {step === 'map' && (
            <div className="space-y-4">
              {/* Location Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectingMarker === 'pickup' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-slate-200 bg-white hover:border-green-300'
                  }`}
                  onClick={() => setSelectingMarker('pickup')}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-green-900 mb-1">Pickup Location</h3>
                      <p className="text-sm text-green-700 truncate">{pickupLocation.address}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectingMarker === 'delivery' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-slate-200 bg-white hover:border-red-300'
                  }`}
                  onClick={() => setSelectingMarker('delivery')}
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-red-900 mb-1">Delivery Address</h3>
                      <p className="text-sm text-red-700 truncate">{deliveryLocation.address}</p>
                      <p className="text-xs text-red-600 mt-1">
                        {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="h-96 rounded-xl overflow-hidden border-2 border-slate-200">
                <MapContainer
                  center={[pickupLocation.lat, pickupLocation.lng]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LocationMarker onLocationSelect={handleMapClick} markerType={selectingMarker} />
                  
                  <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
                    <Popup>
                      <strong>Pickup Location</strong><br />
                      {pickupLocation.address}
                    </Popup>
                  </Marker>
                  
                  <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={deliveryIcon}>
                    <Popup>
                      <strong>Delivery Address</strong><br />
                      {deliveryLocation.address}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Map Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-900">
                  <strong>Instructions:</strong> Click on the {selectingMarker === 'pickup' ? 'green' : 'red'} card above 
                  to select which marker to move, then click on the map to place it.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={getCurrentLocation}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                >
                  <Navigation className="w-4 h-4" />
                  Use My Location
                </button>
                <button
                  onClick={getQuotation}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-600 hover:to-red-600 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin inline mr-2" />
                      Getting Quotation...
                    </>
                  ) : (
                    'Get Quotation'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quotation Confirm */}
          {step === 'confirm' && quotation && (
            <div className="space-y-6">
              {/* Location Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-green-900 mb-1">Pickup</h3>
                      <p className="text-sm text-green-700">{pickupLocation.address}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-1">Delivery</h3>
                      <p className="text-sm text-red-700">{deliveryLocation.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Quotation Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service Type:</span>
                    <span className="font-medium text-slate-900">{quotation.priceBreakdown?.serviceType || 'MOTORCYCLE'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Distance:</span>
                    <span className="font-medium text-slate-900">
                      {quotation.distance ? `${(quotation.distance.value / 1000).toFixed(2)} km` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Estimated Time:</span>
                    <span className="font-medium text-slate-900">30-45 mins</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-900 font-bold">Total Price:</span>
                      <span className="text-2xl font-bold text-pink-600">
                        ₱{(quotation.priceBreakdown?.total || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('map')}
                  className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
                >
                  Back to Map
                </button>
                <button
                  onClick={bookDelivery}
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold hover:from-pink-600 hover:to-red-600 transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin inline mr-2" />
                      Confirming Booking...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Booking Successful!
              </h3>
              <p className="text-slate-600 text-center max-w-md">
                Your Lalamove delivery has been booked successfully. The delivery information has been updated.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LalamoveIntegration;