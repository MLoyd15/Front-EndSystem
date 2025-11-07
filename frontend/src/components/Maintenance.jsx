// pages/Maintenance.jsx
import React, { useState, useEffect } from 'react';
import { useAlert } from '../context/AlertContext.jsx';
import axios from 'axios';
import { VITE_API_BASE } from '../config';
import { 
  Wrench, AlertTriangle, Power, Clock, 
  MessageSquare, Shield, CheckCircle2 
} from 'lucide-react';

const Maintenance = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showAlert } = useAlert();
  
  const [settings, setSettings] = useState({
    enabled: false,
    message: 'We are currently performing scheduled maintenance. Please check back soon.',
    estimatedEnd: '',
    allowedRoles: ['admin', 'superadmin']
  });

  const auth = () => ({ 
    Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
    'Content-Type': 'application/json'
  });

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${VITE_API_BASE}/maintenance/status`, {
        headers: auth()
      });
      setSettings(data);
      setMaintenanceMode(data.enabled);
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const toggleMaintenance = async () => {
    try {
      setSaving(true);
      const newState = !maintenanceMode;
      const payload = { ...settings, enabled: newState };

      await axios.post(`${VITE_API_BASE}/maintenance/toggle`, payload, {
        headers: auth()
      });

      setMaintenanceMode(newState);
      setSettings(prev => ({ ...prev, enabled: newState }));
      
      showAlert(newState ? 'Maintenance mode activated' : 'Maintenance mode deactivated', { title: 'Success', type: 'success' });
    } catch (error) {
      console.error('Error toggling maintenance:', error);
      showAlert(error?.response?.data?.message || 'Failed to toggle maintenance mode', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async () => {
    try {
      setSaving(true);
      await axios.put(`${VITE_API_BASE}/maintenance/settings`, settings, {
        headers: auth()
      });
      showAlert('Settings updated successfully', { title: 'Success', type: 'success' });
    } catch (error) {
      console.error('Error updating settings:', error);
      showAlert(error?.response?.data?.message || 'Failed to update settings', { title: 'Error', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading maintenance settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">System Maintenance</h1>
              <p className="text-sm text-slate-600">Control site-wide maintenance mode</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl shadow-xl ring-1 p-6 mb-6 ${
          maintenanceMode 
            ? 'bg-gradient-to-br from-orange-50 to-red-50 ring-orange-200' 
            : 'bg-gradient-to-br from-emerald-50 to-green-50 ring-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {maintenanceMode ? (
                <AlertTriangle className="w-12 h-12 text-orange-600" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {maintenanceMode ? 'Maintenance Active' : 'System Operational'}
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {maintenanceMode 
                    ? 'Site is currently in maintenance mode' 
                    : 'All systems are running normally'}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleMaintenance}
              disabled={saving}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                maintenanceMode
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              } disabled:opacity-50`}
            >
              <Power className="w-5 h-5" />
              {saving ? 'Updating...' : (maintenanceMode ? 'Disable' : 'Enable')}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-900">Maintenance Settings</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <MessageSquare className="w-4 h-4" />
                Maintenance Message
              </label>
              <textarea
                value={settings.message}
                onChange={(e) => setSettings(prev => ({ ...prev, message: e.target.value }))}
                rows="4"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter message to display during maintenance..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Clock className="w-4 h-4" />
                Estimated End Time
              </label>
              <input
                type="datetime-local"
                value={settings.estimatedEnd}
                onChange={(e) => setSettings(prev => ({ ...prev, estimatedEnd: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                onClick={updateSettings}
                disabled={saving}
                className="w-full px-6 py-3 rounded-xl bg-slate-700 text-white font-bold shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;