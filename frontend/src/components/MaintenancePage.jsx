// components/MaintenancePage.jsx
import React, { useState, useEffect } from 'react';
import { Wrench, Clock, RefreshCcw } from 'lucide-react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';

const MaintenancePage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get(`${VITE_API_BASE}/maintenance/status`);
      setSettings(data);
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
            <span className="text-white font-bold text-2xl">GO</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-full mb-6">
              <Wrench className="w-10 h-10 text-orange-600 animate-pulse" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Under Maintenance
            </h1>
            
            <p className="text-lg text-slate-600 mb-6">
              {settings?.message || 'We are currently performing scheduled maintenance.'}
            </p>

            {settings?.estimatedEnd && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-xl ring-1 ring-orange-200 text-orange-700">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">
                  Expected completion: {new Date(settings.estimatedEnd).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-8">
            <div className="bg-slate-50 rounded-2xl p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">
                What's happening?
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                We're working hard to improve your experience. Our team is performing essential 
                system updates and maintenance to ensure everything runs smoothly.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg hover:shadow-xl"
            >
              <RefreshCcw className="w-5 h-5" />
              Check Status
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Thank you for your patience | GO AGRI TRADING
            </p>
          </div>
        </div>

        {/* Staff Login Link */}
        <div className="mt-6 text-center">
          <a 
            href="/login" 
            className="text-sm text-white hover:text-orange-300 transition-colors"
          >
            Staff Access →
          </a>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;