import React, { useState } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Truck, MapPin, DollarSign, Clock, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import { VITE_API_BASE } from '../config';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
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

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect, markerType }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng, markerType);
    },
  });
  return null;
};

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

    
    if (response.data.success) {
      setQuotation(response.data.data);
      setStep('confirm');
    } else {
      // ✅ Show validation errors if available
      const validationErrors = response.data.validationErrors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const errorMessages = validationErrors.map(err => 
          `${err.field || 'Field'}: ${err.message || 'Invalid'}`
        ).join(', ');
        throw new Error(`Validation errors: ${errorMessages}`);
      }
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
    if (!quotation) return;
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API}/lalamove/order`,
        {
          deliveryId: delivery._id,
          quotationId: quotation.quotationId,
          pickupStopId: quotation.stops?.[0]?.stopId,
          senderName: 'GO AGRI TRADING',
          senderPhone: '+639123456789',
          recipients: [
            {
              stopId: quotation.stops?.[1]?.stopId,
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
        setStep('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(response.data.error || 'Failed to book delivery');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to book delivery');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
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
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">✕</button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">✕</button>
            </div>
          )}

          {/* Step 1: Map Selection */}
          {step === 'map' && (
            <div className="space-y-4">
              {/* Marker Selection Toggle */}
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setSelectingMarker('pickup')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    selectingMarker === 'pickup'
                      ? 'bg-white text-green-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Pickup Location
                </button>
                <button
                  onClick={() => setSelectingMarker('delivery')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    selectingMarker === 'delivery'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Delivery Location
                </button>
              </div>

              {/* Map */}
              <div className="relative rounded-xl overflow-hidden border-2 border-gray-200" style={{ height: '400px' }}>
                <MapContainer
                  center={[14.5995, 120.9842]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <MapClickHandler 
                    onLocationSelect={handleMapClick}
                    markerType={selectingMarker}
                  />

                  {/* Pickup Marker */}
                  <Marker position={[pickupLocation.lat, pickupLocation.lng]} icon={pickupIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-green-700">📦 Pickup</p>
                        <p className="text-xs text-gray-600 mt-1">{pickupLocation.address}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Delivery Marker */}
                  <Marker position={[deliveryLocation.lat, deliveryLocation.lng]} icon={deliveryIcon}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold text-red-700">🏠 Delivery</p>
                        <p className="text-xs text-gray-600 mt-1">{deliveryLocation.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>

                {/* Current Location Button */}
                <button
                  onClick={getCurrentLocation}
                  className="absolute top-4 right-4 p-3 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition z-[1000]"
                  title="Use current location"
                >
                  <Navigation className="w-5 h-5 text-blue-600" />
                </button>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 mb-1">Pickup Location</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{pickupLocation.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pickupLocation.lat.toFixed(6)}, {pickupLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 mb-1">Delivery Location</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{deliveryLocation.address}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {deliveryLocation.lat.toFixed(6)}, {deliveryLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('quotation')}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-red-600 transition"
                >
                  Continue to Quotation
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Get Quotation */}
          {step === 'quotation' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Pickup Location</p>
                    <p className="text-sm text-gray-600">{pickupLocation.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-600">{deliveryLocation.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('map')}
                  disabled={loading}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Back to Map
                </button>
                <button
                  onClick={getQuotation}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-red-600 disabled:opacity-50"
                >
                  {loading ? 'Getting quotation...' : 'Get Quotation'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm Booking */}
          {step === 'confirm' && quotation && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-xl p-6 border border-pink-200">
                <h3 className="font-bold text-gray-900 mb-4">Quotation Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Delivery Fee
                    </span>
                    <span className="font-bold text-gray-900 text-xl">
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
                  onClick={() => setStep('quotation')}
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

          {/* Step 4: Success */}
          {step === 'success' && (
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