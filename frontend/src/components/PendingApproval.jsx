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
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

// Modal Component for Viewing Changes
const ChangesModal = ({ isOpen, onClose, log }) => {
  if (!isOpen) return null;

  const getChangedFields = (before, after) => {
    const changes = [];
    
    if (after === null && before !== null) {
      return [{
        field: 'Record',
        before: 'Existing Data',
        after: 'Deleted'
      }];
    }
    
    if (before === null && after !== null) {
      const keyFields = ['categoryName', 'productName', 'name', 'title', 'description', 'price', 'stock', 'active'];
      const relevantFields = {};
      
      if (typeof after === 'object') {
        Object.keys(after).forEach(key => {
          if (keyFields.includes(key) && after[key] !== null && after[key] !== undefined && after[key] !== '') {
            relevantFields[key] = after[key];
          }
        });
      }
      
      if (Object.keys(relevantFields).length > 0) {
        Object.entries(relevantFields).forEach(([key, value]) => {
          changes.push({
            field: key,
            before: null,
            after: value
          });
        });
      } else {
        changes.push({
          field: 'Record',
          before: 'None',
          after: 'Created'
        });
      }
      
      return changes;
    }
    
    if (typeof before === 'object' && typeof after === 'object') {
      const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
      
      allKeys.forEach(key => {
        if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) {
          return;
        }
        
        const beforeValue = before ? before[key] : undefined;
        const afterValue = after ? after[key] : undefined;
        
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          changes.push({
            field: key,
            before: beforeValue,
            after: afterValue
          });
        }
      });
    } else if (before !== after) {
      changes.push({
        field: 'Value',
        before: before,
        after: after
      });
    }
    
    return changes;
  };

  const formatFieldName = (fieldName) => {
    if (!fieldName) return '';
    
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

    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

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
    
    if (typeof value === 'number' && (value.toString().includes('.') || value > 100)) {
      return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    return String(value);
  };

  const changedFields = log?.changes ? getChangedFields(log.changes.before, log.changes.after) : [];
  const isCreate = log?.action?.includes('CREATE');

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - FIXED: Changed to white background and made close button more visible */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Change Details</h2>
            <p className="text-sm text-gray-600 mt-1">{log?.entityName || 'View changes'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-lg transition-all font-bold text-2xl"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content - Keep white background */}
        <div className="p-6 overflow-y-auto bg-white" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {changedFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No specific field changes detected
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {isCreate ? 'New Record Creation' : 'Record Modification'}
                  </span>
                </div>
              </div>

              {changedFields.map((change, index) => (
                <div key={index} className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <div className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                    {formatFieldName(change.field)}
                  </div>
                  
                  {isCreate && change.before === null ? (
                    // For CREATE operations - only show new value
                    <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium text-green-700 uppercase">New Value</span>
                      </div>
                      <div className="text-base font-medium text-gray-900 pl-4">
                        {formatFieldValue(change.after)}
                      </div>
                    </div>
                  ) : (
                    // For UPDATE/DELETE operations - show before and after
                    <div className="grid grid-cols-2 gap-4">
                      {/* Before */}
                      <div className="bg-white rounded-lg p-4 border-l-4 border-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-xs font-medium text-red-600 uppercase">Before</span>
                        </div>
                        <div className="text-sm text-gray-700 pl-4">
                          {formatFieldValue(change.before)}
                        </div>
                      </div>
                      
                      {/* After */}
                      <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-600 uppercase">After</span>
                        </div>
                        <div className="text-base font-medium text-gray-900 pl-4">
                          {formatFieldValue(change.after)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Keep clean white/gray background */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingApprovals = () => {
  const [pendingLogs, setPendingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState({});
  const [processing, setProcessing] = useState(false);
  const [viewChangesModal, setViewChangesModal] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
        setCurrentPage(1); // Reset to first page when data refreshes
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
        body: JSON.stringify({ notes: approvalNotes[logId] || '' }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Action approved successfully');
        setApprovalNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[logId];
          return newNotes;
        });
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
    if (action.includes('CREATE')) return 'text-green-700 bg-green-50 ring-green-300';
    if (action.includes('UPDATE')) return 'text-amber-700 bg-amber-50 ring-amber-300';
    if (action.includes('DELETE')) return 'text-red-700 bg-red-50 ring-red-300';
    return 'text-gray-700 bg-gray-50 ring-gray-300';
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

  // Pagination calculations
  const totalPages = Math.ceil(pendingLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = pendingLogs.slice(startIndex, endIndex);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen">
      {/* Changes Modal */}
      <ChangesModal
        isOpen={!!viewChangesModal}
        onClose={() => setViewChangesModal(null)}
        log={viewChangesModal}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-amber-900 flex items-center gap-2">
              <Clock className="w-8 h-8 text-amber-600" />
              Pending Approvals
            </h1>
            <p className="text-amber-700 mt-1 font-medium">
              Review and approve admin actions
            </p>
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-lg ring-2 ring-yellow-200">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-900">
              {pendingLogs.length} Pending
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 ring-2 ring-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Pending</p>
              <p className="text-2xl font-bold text-amber-700">
                {pendingLogs.length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 ring-2 ring-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Products</p>
              <p className="text-2xl font-bold text-green-700">
                {pendingLogs.filter(l => l.entity === 'PRODUCT').length}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 ring-2 ring-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Other</p>
              <p className="text-2xl font-bold text-yellow-700">
                {pendingLogs.filter(l => l.entity !== 'PRODUCT').length}
              </p>
            </div>
            <Settings className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Pending Approvals List */}
      {pendingLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center ring-1 ring-gray-200">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            There are no pending approvals at the moment.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {currentLogs.map((log) => (
              <div
                key={log._id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between">
                  {/* Left Section */}
                  <div className="flex gap-4 flex-1">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ring-2 ${getActionColor(log.action)}`}>
                      {getEntityIcon(log.entity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {/* Action & Entity */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ${getActionColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {log.entity}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-gray-900 font-semibold mb-2 text-lg">
                        {log.description}
                      </p>

                      {/* Entity Name */}
                      {log.entityName && (
                        <p className="text-sm text-gray-600 mb-3">
                          Item: <span className="font-medium text-gray-900">{log.entityName}</span>
                        </p>
                      )}

                      {/* Admin & Date */}
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{log.adminName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(log.createdAt)}
                        </div>
                      </div>

                      {/* View Changes Button */}
                      <button
                        onClick={() => setViewChangesModal(log)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm ring-2 ring-green-300"
                      >
                        <Eye className="w-4 h-4" />
                        View Changes
                      </button>

                      {/* Approval Notes Input */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Approval Notes (Optional)
                        </label>
                        <textarea
                          value={approvalNotes[log._id] || ''}
                          onChange={(e) => setApprovalNotes(prev => ({
                            ...prev,
                            [log._id]: e.target.value
                          }))}
                          placeholder="Add any notes or comments..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(log._id)}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(log._id)}
                      disabled={processing}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-sm p-4 ring-1 ring-gray-200">
              <div className="text-sm text-gray-600">
                Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-gray-900">{Math.min(endIndex, pendingLogs.length)}</span> of{' '}
                <span className="font-medium text-gray-900">{pendingLogs.length}</span> items
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition ${
                            currentPage === pageNum
                              ? 'bg-green-600 text-white ring-2 ring-green-300'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === currentPage - 2 ||
                      pageNum === currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PendingApprovals;