import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { VITE_API_BASE } from '../config.js';
import { FaAward, FaUsers, FaBolt, FaCheckCircle, FaExclamationCircle, FaHistory, FaTimes, FaCalendar, FaCoins } from 'react-icons/fa';

const API = VITE_API_BASE;
const CURRENCY = "₱";
const peso = (n) =>
  `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const Loyalty = () => {
  const [loyaltyData, setLoyaltyData] = useState({
    rewards: [],
    users: [],
    stats: {
      totalRewards: 0,
      totalUsers: 0,
      totalPointsIssued: 0,
      totalPointsRedeemed: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ✅ Use the same token as AdminKpi
      const token = localStorage.getItem('pos-token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log('Fetching from:', `${API}/loyalty/rewards`);
      console.log('Headers:', headers);
      
      // ✅ Fetch loyalty rewards - Same endpoint as AdminKpi
      const { data } = await axios.get(`${API}/loyalty/rewards`, { headers });
      
      console.log('Raw response:', data);
      
      // ✅ Handle different response structures (same as AdminKpi)
      const loyaltyRewards = Array.isArray(data) ? data 
        : data?.rewards || data?.data || [];

      console.log('Processed rewards:', loyaltyRewards);

      // Calculate stats
      const totalRewards = loyaltyRewards.length;
      const totalPointsIssued = loyaltyRewards.reduce((sum, reward) => sum + (reward.points || 0), 0);
      
      // Calculate redeemed points from pointsHistory
      const totalPointsRedeemed = loyaltyRewards.reduce((sum, reward) => {
        if (reward.pointsHistory && Array.isArray(reward.pointsHistory)) {
          return sum + reward.pointsHistory
            .filter(h => h.change < 0)
            .reduce((s, h) => s + Math.abs(h.change), 0);
        }
        return sum + (reward.redeemedPoints || 0);
      }, 0);

      // Get unique users
      const uniqueUsers = [...new Set(loyaltyRewards.map(reward => 
        reward.userId?._id || reward.userId
      ))].filter(Boolean);
      const totalUsers = uniqueUsers.length;

      setLoyaltyData({
        rewards: loyaltyRewards,
        users: uniqueUsers,
        stats: {
          totalRewards,
          totalUsers,
          totalPointsIssued,
          totalPointsRedeemed
        }
      });
    } catch (err) {
      console.error('❌ Error fetching loyalty data:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to load loyalty data. Please check your connection.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (reward) => {
    try {
      setLoadingDetails(true);
      setSelectedUser(reward);
      
      // Since we removed order fetching, we just set the reward and points history
      setUserDetails({
        reward,
        pointsHistory: reward.pointsHistory || []
      });
    } catch (err) {
      console.error('❌ Error loading user details:', err);
      alert('Failed to load user details. Please try again.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setSelectedUser(null);
    setUserDetails(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <FaAward className="text-xl text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-md">
          <div className="flex items-start gap-3">
            <FaExclamationCircle className="text-2xl text-red-500 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Loyalty Data</h3>
              <p className="text-red-800 mb-2">{error}</p>
              <p className="text-sm text-red-700 mb-4">
                Endpoint: {API}/loyalty/rewards
              </p>
              <button 
                onClick={fetchLoyaltyData}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                🔄 Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-green-600">
            Loyalty System
          </h1>
          <p className="text-gray-600 mt-2">Manage and track customer rewards</p>
        </div>
        <button 
          onClick={fetchLoyaltyData}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
        >
          🔄 Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rewards Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Rewards</p>
              <p className="text-4xl font-bold text-green-600">
                {loyaltyData.stats.totalRewards}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-500 shadow-lg">
              <FaAward className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Active Users</p>
              <p className="text-4xl font-bold text-green-600">
                {loyaltyData.stats.totalUsers}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-600 shadow-lg">
              <FaUsers className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Points Issued Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Points Issued</p>
              <p className="text-4xl font-bold text-amber-600">
                {loyaltyData.stats.totalPointsIssued.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-amber-600 shadow-lg">
              <FaBolt className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Points Redeemed Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Points Redeemed</p>
              <p className="text-4xl font-bold text-green-600">
                {loyaltyData.stats.totalPointsRedeemed.toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-green-500 shadow-lg">
              <FaCheckCircle className="text-white text-3xl" />
            </div>
          </div>
        </div>
      </div>

      {/* All Loyalty Members Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">All Loyalty Members</h2>
          <p className="text-sm text-gray-600 mt-1">Complete list of all loyalty program participants</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Points
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loyaltyData.rewards.length > 0 ? (
                loyaltyData.rewards
                  .sort((a, b) => (b.points || 0) - (a.points || 0))
                  .map((reward, index) => (
                    <tr 
                      key={index} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => fetchUserDetails(reward)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mr-3">
                            {reward.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {reward.userId?.name || 'Unknown User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {reward.userId?.email || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FaBolt className="mr-1 text-amber-600" />
                          <span className="text-lg font-bold text-green-600">
                            {reward.points || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex px-3 py-1 text-xs font-bold rounded-full text-white ${
                            reward.tier === 'gold' 
                              ? 'bg-amber-500' 
                              : reward.tier === 'silver'
                              ? 'bg-gray-400'
                              : reward.tier === 'bronze'
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                        >
                          {reward.tier?.toUpperCase() || 'MEMBER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {peso(reward.totalSpent || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <FaHistory className="text-gray-400 mr-2" />
                          {reward.purchaseCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {reward.updatedAt || reward.createdAt 
                          ? new Date(reward.updatedAt || reward.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FaAward className="text-6xl text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No loyalty rewards found</p>
                      <p className="text-gray-400 text-sm mt-2">Start rewarding your customers to see data here</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal with Transparent Background */}
      {selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white bg-opacity-95 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 bg-opacity-90 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-green-600 font-bold text-2xl shadow-lg">
                  {selectedUser.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-white">
                  <h2 className="text-2xl font-bold">{selectedUser.userId?.name || 'Unknown User'}</h2>
                  <p className="text-green-100">{selectedUser.userId?.email || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
              >
                <FaTimes className="text-2xl" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-green-500"></div>
                </div>
              ) : userDetails ? (
                <div className="space-y-6">
                  {/* User Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 bg-opacity-80 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBolt className="text-green-600" />
                        <p className="text-sm font-semibold text-gray-600">Current Points</p>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{userDetails.reward.points || 0}</p>
                    </div>
                    <div className="bg-amber-50 bg-opacity-80 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCoins className="text-amber-600" />
                        <p className="text-sm font-semibold text-gray-600">Total Spent</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{peso(userDetails.reward.totalSpent || 0)}</p>
                    </div>
                    <div className="bg-blue-50 bg-opacity-80 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaHistory className="text-blue-600" />
                        <p className="text-sm font-semibold text-gray-600">Total Purchases</p>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{userDetails.reward.purchaseCount || 0}</p>
                    </div>
                    <div className="bg-purple-50 bg-opacity-80 border border-purple-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaAward className="text-purple-600" />
                        <p className="text-sm font-semibold text-gray-600">Loyalty Tier</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">{userDetails.reward.tier?.toUpperCase() || 'MEMBER'}</p>
                    </div>
                  </div>

                  {/* Points History */}
                  <div className="bg-white bg-opacity-90 border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                    <div className="bg-gray-50 bg-opacity-90 px-6 py-4 border-b border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FaHistory className="text-green-600" />
                        Points History
                      </h3>
                    </div>
                    <div className="p-6">
                      {userDetails.pointsHistory && userDetails.pointsHistory.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {userDetails.pointsHistory.map((history, idx) => (
                            <div 
                              key={idx}
                              className={`flex items-center justify-between p-4 rounded-lg border ${
                                history.change > 0 
                                  ? 'bg-green-50 bg-opacity-70 border-green-200' 
                                  : 'bg-red-50 bg-opacity-70 border-red-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  history.change > 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  <FaBolt className="text-white" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{history.reason || 'Points update'}</p>
                                  <p className="text-sm text-gray-600">
                                    {history.date ? new Date(history.date).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className={`text-2xl font-bold ${
                                history.change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {history.change > 0 ? '+' : ''}{history.change}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <FaHistory className="text-4xl mx-auto mb-2 text-gray-300" />
                          <p>No points history available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loyalty;