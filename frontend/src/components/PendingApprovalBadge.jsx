import React, { useState, useEffect } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

/**
 * Notification Badge Component
 * Shows count of pending approvals for super admins
 * Can be placed in sidebar or header
 */
const PendingApprovalsBadge = ({ userRole }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Only fetch if user is super admin
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    fetchPendingCount();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  const fetchPendingCount = async () => {
    try {
      const response = await fetch(`${API}/activity-logs/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setPendingCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if not super admin
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <Link
      to="/admin/pending-approvals"
      className="relative inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <Bell className="w-5 h-5 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Approvals</span>
      
      {!loading && pendingCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </Link>
  );
};

/**
 * Compact version for mobile or small spaces
 */
export const CompactPendingBadge = ({ userRole }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchCount = async () => {
      try {
        const response = await fetch(`${API}/activity-logs/pending`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
          },
        });
        const result = await response.json();
        if (result.success) setPendingCount(result.count || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  if (!isSuperAdmin || pendingCount === 0) return null;

  return (
    <Link to="/admin/pending-approvals">
      <div className="relative">
        <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900" />
        <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      </div>
    </Link>
  );
};

/**
 * Banner notification that appears at top of page
 */
export const PendingApprovalsBanner = ({ userRole }) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(true);
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'superadmin';

  useEffect(() => {
    if (!isSuperAdmin) return;

    const fetchCount = async () => {
      try {
        const response = await fetch(`${API}/activity-logs/pending`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
          },
        });
        const result = await response.json();
        if (result.success) setPendingCount(result.count || 0);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  if (!isSuperAdmin || pendingCount === 0 || !visible) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              You have {pendingCount} pending {pendingCount === 1 ? 'approval' : 'approvals'}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Review and approve admin actions to keep your platform running smoothly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/pending-approvals"
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-sm"
          >
            Review Now
          </Link>
          <button
            onClick={() => setVisible(false)}
            className="text-yellow-600 hover:text-yellow-800 p-1"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalsBadge;