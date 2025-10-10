// components/MaintenanceGuard.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { VITE_API_BASE } from '../config';
import MaintenancePage from './components/MaintenancePage';

const MaintenanceGuard = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [canAccess, setCanAccess] = useState(true);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const token = localStorage.getItem('pos-token');
        
        if (!token) {
          const { data } = await axios.get(`${VITE_API_BASE}/maintenance/status`);
          setMaintenanceEnabled(data.enabled);
          setCanAccess(!data.enabled);
        } else {
          const { data } = await axios.get(`${VITE_API_BASE}/maintenance/check-access`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setMaintenanceEnabled(data.maintenanceEnabled);
          setCanAccess(!data.maintenanceEnabled || data.canAccess);
        }
      } catch (error) {
        console.error('Error checking maintenance:', error);
        setCanAccess(true);
      } finally {
        setChecking(false);
      }
    };

    checkMaintenance();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (maintenanceEnabled && !canAccess) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
};

export default MaintenanceGuard;