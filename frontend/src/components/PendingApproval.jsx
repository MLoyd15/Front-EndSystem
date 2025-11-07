import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Package,
  Tag,
  Truck,
  Gift,
  Settings,
} from 'lucide-react';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

const PendingApprovals = () => {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/activity-logs/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setPendingLogs(result.data);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      alert('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (logId) => {
    if (!window.confirm('Are you sure you want to approve this action?')) {
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch(`${API}/activity-logs/${logId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
        body: JSON.stringify({ notes: approvalNotes }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Action approved successfully');
        setSelectedLog(null);
        setApprovalNotes('');
        fetchPendingApprovals();
      } else {
        alert(result.error || 'Failed to approve action');
      }
    } catch (error) {
      console.error('Error approving action:', error);
      alert('Failed to approve action');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (logId) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(true);
      const response = await fetch(`${API}/activity-logs/${logId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
        body: JSON.stringify({ notes: reason }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Action rejected successfully');
        setSelectedLog(null);
        fetchPendingApprovals();
      } else {
        alert(result.error || 'Failed to reject action');
      }
    } catch (error) {
      console.error('Error rejecting action:', error);
      alert('Failed to reject action');
    } finally {
      setProcessing(false);
    }
  };

  const getEntityIcon = (entity) => {
    const icons = {
      PRODUCT: Package,
      CATEGORY: Tag,
      PROMO: Gift,
      DELIVERY: Truck,
      INVENTORY: Package,
      SETTINGS: Settings,
    };
    const Icon = icons[entity] || Package;
    return <Icon className="w-5 h-5" />;
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'text-green-600 bg-green-50';
    if (action.includes('UPDATE')) return 'text-blue-600 bg-blue-50';
    if (action.includes('DELETE')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDate = (date) => {
    const now = new Date();
    const logDate = new Date(date);
    const diffMs = now - logDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return logDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format field names to be more readable
  const formatFieldName = (fieldName) => {
    if (!fieldName) return '';
    
    // Special cases
    const specialCases = {
      '_id': 'ID',
      'categoryName': 'Category',
      'categoryDescription': 'Description',
      'updatedAt': 'Updated',
      'createdAt': 'Created',
      'active': 'Active',
      'productName': 'Product Name',
      'price': 'Price',
      'stock': 'Stock',
      'description': 'Description',
      'weight': 'Weight',
      'unit': 'Unit',
    };

    if (specialCases[fieldName]) {
      return specialCases[fieldName];
    }

    // Convert camelCase to Title Case
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format field values to be more readable
  const formatFieldValue = (value) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Empty</span>;
    }
    
    if (typeof value === 'boolean') {
      return value ? (
        <span className="text-green-600 font-medium">Yes</span>
      ) : (
        <span className="text-red-600 font-medium">No</span>
      );
    }
    
    if (value instanceof Date || !isNaN(Date.parse(value))) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // For prices, add currency formatting
    if (typeof value === 'number' && (value.toString().includes('.') || value > 100)) {
      return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return String(value);
  };

  // Highlight changed values
  const highlightChanges = (key, newValue, oldData) => {
    const oldValue = oldData && oldData[key];
    const isChanged = oldValue !== newValue;
    
    const formattedValue = formatFieldValue(newValue);
    
    if (isChanged && oldValue !== undefined) {
      return (
        <span className="bg-green-100 px-1 rounded">
          {formattedValue}
        </span>
      );
    }
    
    return formattedValue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-8 h-8 text-yellow-500" />
              Pending Approvals
            </h1>
            <p className="text-gray-600 mt-1">
              Review and approve admin actions
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-900">
              {pendingLogs.length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Pending Approvals List */}
      {pendingLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            There are no pending approvals at the moment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingLogs.map((log) => (
            <div
              key={log._id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                {/* Left Section */}
                <div className="flex gap-4 flex-1">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                    {getEntityIcon(log.entity)}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    {/* Action & Entity */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {log.entity}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-900 font-medium mb-2">
                      {log.description}
                    </p>

                    {/* Entity Name */}
                    {log.entityName && (
                      <p className="text-sm text-gray-600 mb-3">
                        Item: <span className="font-medium">{log.entityName}</span>
                      </p>
                    )}

                    {/* Admin & Date */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {log.adminName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(log.createdAt)}
                      </div>
                    </div>

                    {/* Changes Preview */}
                    {log.changes && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                          Changes Preview
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          {/* Before Column */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              Before
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                              {log.changes.before === null ? (
                                <span className="text-sm text-gray-400 italic">Empty</span>
                              ) : typeof log.changes.before === 'object' ? (
                                Object.entries(log.changes.before).map(([key, value], index) => (
                                  <div key={index} className="text-sm">
                                    <span className="text-gray-600 font-medium">{formatFieldName(key)}:</span>{' '}
                                    <span className="text-gray-800">{formatFieldValue(value)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-sm text-gray-800">{String(log.changes.before)}</span>
                              )}
                            </div>
                          </div>
                          
                          {/* After Column */}
                          <div>
                            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              After
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
                              {log.changes.after === null ? (
                                <span className="text-sm text-gray-400 italic">Deleted</span>
                              ) : typeof log.changes.after === 'object' ? (
                                Object.entries(log.changes.after).map(([key, value], index) => (
                                  <div key={index} className="text-sm">
                                    <span className="text-gray-600 font-medium">{formatFieldName(key)}:</span>{' '}
                                    <span className="text-gray-800">
                                      {highlightChanges(key, value, log.changes.before)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-sm text-gray-800">{String(log.changes.after)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(log._id)}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(log._id)}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {/* Approval Notes Input */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes or comments..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingLogs.length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingLogs.filter(l => l.entity === 'PRODUCT').length}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Other</p>
              <p className="text-2xl font-bold text-gray-900">
                {pendingLogs.filter(l => l.entity !== 'PRODUCT').length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovals;