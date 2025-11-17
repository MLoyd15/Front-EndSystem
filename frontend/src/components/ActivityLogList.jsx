import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  Search,
  Eye,
  AlertCircle
} from 'lucide-react';
import { VITE_API_BASE } from '../config';

const API = VITE_API_BASE;

// Map backend roles to display labels in Activity Log
const getRoleLabel = (role) => {
  if (!role) return 'User';
  const r = String(role).toLowerCase();
  if (r === 'superadmin') return 'Owner';
  if (r === 'admin') return 'Staff';
  return 'User';
};

const ActivityLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    action: '',
    entity: '',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchActivityLogs();
  }, [filters]);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v)
      );

      const response = await fetch(`${API}/activity-logs?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('pos-token')}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      AUTO_APPROVED: 'bg-blue-100 text-blue-800',
    };

    const icons = {
      PENDING: <Clock className="w-4 h-4" />,
      APPROVED: <CheckCircle className="w-4 h-4" />,
      REJECTED: <XCircle className="w-4 h-4" />,
      AUTO_APPROVED: <CheckCircle className="w-4 h-4" />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getActionColor = (action) => {
    if (typeof action !== 'string') return 'text-gray-600';
    if (action.includes('CREATE')) return 'text-green-600';
    if (action.includes('UPDATE')) return 'text-blue-600';
    if (action.includes('DELETE')) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = logs.filter(log => {
    const desc = (log?.description || '').toLowerCase();
    const admin = (log?.adminName || '').toLowerCase();
    const term = (searchTerm || '').toLowerCase();
    return term === '' || desc.includes(term) || admin.includes(term);
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="text-gray-600 mt-1">
          Track all admin activities and approvals
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="AUTO_APPROVED">Auto Approved</option>
          </select>

          {/* Action Filter */}
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Actions</option>
            <option value="CREATE_PRODUCT">Create Product</option>
            <option value="UPDATE_PRODUCT">Update Product</option>
            <option value="DELETE_PRODUCT">Delete Product</option>
            <option value="CREATE_CATEGORY">Create Category</option>
            <option value="UPDATE_CATEGORY">Update Category</option>
            <option value="DELETE_CATEGORY">Delete Category</option>
            <option value="UPDATE_INVENTORY">Update Inventory</option>
            <option value="CREATE_PROMO">Create Promo</option>
            <option value="UPDATE_DELIVERY">Update Delivery</option>
          </select>

          {/* Entity Filter */}
          <select
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Entities</option>
            <option value="PRODUCT">Product</option>
            <option value="CATEGORY">Category</option>
            <option value="PROMO">Promotion</option>
            <option value="DELIVERY">Delivery</option>
            <option value="INVENTORY">Inventory</option>
          </select>
        </div>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading activities...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activity logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {getRoleLabel(log?.adminId?.role)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.adminEmail}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {log.entity}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {log.description}
                      </div>
                      {log.entityName && (
                        <div className="text-xs text-gray-500 mt-1">
                          {log.entityName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-green-600 hover:text-green-900 font-medium flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <ActivityLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

// Activity Log Detail Modal Component
const ActivityLogDetailModal = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold text-white">Activity Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-green-100 transition-colors"
          >
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Status</label>
            <div className="mt-2">
              {log.status === 'PENDING' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-medium border border-yellow-200">
                  <Clock className="w-5 h-5" />
                  Pending Approval
                </span>
              )}
              {log.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  Approved
                </span>
              )}
              {log.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium border border-red-200">
                  <XCircle className="w-5 h-5" />
                  Rejected
                </span>
              )}
              {log.status === 'AUTO_APPROVED' && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium border border-blue-200">
                  <CheckCircle className="w-5 h-5" />
                  Auto Approved
                </span>
              )}
            </div>
          </div>

          {/* Admin Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Performed By</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-shrink-0 h-12 w-12 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-200">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-base font-semibold text-gray-900">{getRoleLabel(log?.adminId?.role)}</div>
                <div className="text-sm text-gray-600">{log.adminEmail}</div>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Action</label>
            <div className="mt-2 text-base font-medium text-gray-900">{(log?.action || '').replace(/_/g, ' ')}</div>
            <div className="mt-1 text-sm text-gray-600">{log.entity}</div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Description</label>
            <div className="mt-2 text-base text-gray-900">{log.description}</div>
            {log.entityName && (
              <div className="mt-1 text-sm text-gray-600">{log.entityName}</div>
            )}
          </div>

          {/* Changes */}
          {log.changes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3 block">Changes</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="bg-yellow-50 rounded-lg px-3 py-2 mb-2 border border-yellow-200">
                    <div className="text-xs font-bold text-yellow-800 uppercase tracking-wide">Before</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-gray-800 space-y-1">
                      {Object.entries((log?.changes?.before) || {}).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-600 min-w-[100px]">{key}:</span>
                          <span className="text-gray-900">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="bg-green-50 rounded-lg px-3 py-2 mb-2 border border-green-200">
                    <div className="text-xs font-bold text-green-800 uppercase tracking-wide">After</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="text-sm text-gray-800 space-y-1">
                      {Object.entries((log?.changes?.after) || {}).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium text-gray-600 min-w-[100px]">{key}:</span>
                          <span className="text-gray-900">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Review Info */}
          {log.reviewedBy && (
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Reviewed By</label>
              <div className="mt-2">
                <div className="text-base font-semibold text-gray-900">{log.reviewedByName}</div>
                <div className="text-sm text-gray-600">
                  {new Date(log.reviewedAt).toLocaleString()}
                </div>
                {log.reviewNotes && (
                  <div className="mt-3 text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                    {log.reviewNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Created At</label>
            <div className="mt-2 flex items-center gap-2 text-base text-gray-900">
              <Calendar className="w-5 h-5 text-green-600" />
              {new Date(log.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogList;