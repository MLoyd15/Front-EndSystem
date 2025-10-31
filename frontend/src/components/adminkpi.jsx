// COMPLETE UPDATED AdminKpi.jsx with Loyalty Data, Modal, and Dropdown Navigation

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUsers, FaBoxes, FaExclamationTriangle, FaTruck, FaAward, FaTimes, FaChevronDown, FaChartLine, FaTachometerAlt } from "react-icons/fa";
import SalesChart from "./SalesChart";
import Loyalty from "./Loyalty";
import { VITE_API_BASE } from "../config";

const API = VITE_API_BASE;
const CURRENCY = "₱";
const peso = (n) =>
  `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const ONE_DAY = 24 * 60 * 60 * 1000;

// View options for dropdown
const VIEWS = {
  DASHBOARD: "dashboard",
  LOYALTY: "loyalty",
  SALES: "sales",
};

const VIEW_OPTIONS = [
  {
    id: VIEWS.DASHBOARD,
    label: "KPI Dashboard",
    icon: <FaTachometerAlt />,
    description: "Business overview and metrics",
  },
  {
    id: VIEWS.LOYALTY,
    label: "Loyalty Program",
    icon: <FaAward />,
    description: "Manage rewards and members",
  },
  {
    id: VIEWS.SALES,
    label: "Sales Analytics",
    icon: <FaChartLine />,
    description: "Revenue and trends",
  },
];

const countDeliveredInRange = (deliveries, startMs, endMs) =>
  deliveries.reduce((count, d) => {
    const t = new Date(d?.createdAt || d?.date || d?.updatedAt || Date.now()).getTime();
    const status = String(d?.status || "").toLowerCase();
    const isDelivered =
      status.includes("deliver") || status.includes("complete") || status.includes("fulfill");
    return t >= startMs && t < endMs && isDelivered ? count + 1 : count;
  }, 0);

function deliveryRangeFor(period) {
  const now = Date.now();
  if (period === "month") {
    const startThis = new Date();
    startThis.setDate(1);
    startThis.setHours(0, 0, 0, 0);
    return { start: startThis.getTime(), end: now, label: "This month" };
  }
  return { start: now - 7 * ONE_DAY, end: now, label: "Last 7 days" };
}

function EnhancedKpiCard({ title, value, icon, gradient = "from-indigo-500 to-purple-600", subtitle }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
            <div className="text-white text-xl">{icon}</div>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="text-white text-lg">{icon}</div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function StockAlertCard({ title, items, type = "low" }) {
  const config = {
    low: { icon: <FaExclamationTriangle />, bgColor: "bg-amber-50", textColor: "text-amber-700", badgeBg: "bg-amber-100", emptyIcon: "📦" },
    out: { icon: <FaExclamationTriangle />, bgColor: "bg-red-50", textColor: "text-red-700", badgeBg: "bg-red-100", emptyIcon: "🚫" },
  };
  const style = config[type];

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${style.bgColor} ${style.textColor}`}>{style.icon}</div>
          <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${style.bgColor} ${style.textColor}`}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <div className="text-3xl mb-2">{style.emptyIcon}</div>
          <p className="text-xs">All good here!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.slice(0, 5).map((item) => (
            <div key={item._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
              <span className="text-sm text-gray-800 truncate flex-1">{item.name || "Unnamed"}</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${style.badgeBg} ${style.textColor} ml-2`}>
                {type === "out" ? "OOS" : `${item.stock} left`}
              </span>
            </div>
          ))}
          {items.length > 5 && (
            <div className="text-center pt-2">
              <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                +{items.length - 5} more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// User Points History Modal
function UserHistoryModal({ user, onClose, allRewards }) {
  if (!user) return null;

  const userReward = allRewards.find(r => r.userId?._id === user.userId || r.userId === user.userId);
  const pointsHistory = userReward?.pointsHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                {user.userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user.userName}</h2>
                <p className="text-sm text-white/80">{user.userEmail}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-white/70">Total Points</p>
              <p className="text-2xl font-bold">{user.points}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-white/70">Total Spent</p>
              <p className="text-lg font-bold">{peso(user.totalSpent)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs text-white/70">Purchases</p>
              <p className="text-2xl font-bold">{user.purchaseCount}</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-280px)]">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Points History</h3>
          
          {pointsHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No points history yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pointsHistory
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {entry.source || 'order_processed'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ring-1 ${
                        entry.source === 'redeem' 
                          ? 'bg-red-50 text-red-700 ring-red-200' 
                          : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      }`}>
                        {entry.source === 'redeem' ? '-' : '+'}{entry.points} pts
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Sales Analytics View Component
function SalesAnalyticsView() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sales Analytics</h2>
          <p className="text-gray-500 mt-1">Detailed revenue and sales trends</p>
        </div>
        
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trends (Revenue & Units Sold)</h3>
          <div className="rounded-xl border border-gray-100 p-4">
            <SalesChart />
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard View Component
function DashboardView({ stats, err, lowStockItems, outOfStockItems, deliveryCount, deliveryLabel }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <div className="space-y-4">
          <SectionHeader icon={<FaTruck />} title="Business Overview" subtitle="Key performance metrics" />

          {err && (
            <div className="rounded-xl border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-red-600 mt-0.5" />
                <p className="text-sm text-red-700">{err}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <EnhancedKpiCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              icon={<FaUsers />}
              gradient="from-blue-500 to-cyan-600"
            />
            
            <EnhancedKpiCard
              title="Total Delivery (Month)"
              value={deliveryCount.toLocaleString()}
              icon={<FaTruck />}
              gradient="from-teal-500 to-emerald-600"
              subtitle={deliveryLabel}
            />
          </div>
        </div>

        <div className="space-y-4">
          <SectionHeader icon={<FaBoxes />} title="Inventory Status" subtitle="Stock management" />
          <div className="space-y-3">
            <EnhancedKpiCard
              title="Categories"
              value={stats.totalCategories}
              icon={<FaBoxes />}
              gradient="from-indigo-500 to-blue-600"
              subtitle="Product categories"
            />
            <EnhancedKpiCard
              title="Low Stock Items"
              value={stats.lowStock}
              icon={<FaExclamationTriangle />}
              gradient="from-amber-500 to-yellow-600"
              subtitle="Needs restocking"
            />
          </div>
        </div>


      </div>

      <div className="lg:col-span-3 space-y-6">
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Sales Trends (Revenue &amp; Units Sold)</h3>
          </div>
          <div className="rounded-xl border border-gray-100 p-2">
            <SalesChart />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminKpi() {
  // View state
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCategories: 0,
    orderVolume: 0,
    avgOrderValue: 0,
    lowStock: 0,
    topLoyaltyUsers: [],
    allLoyaltyRewards: [],
  });

  const [err, setErr] = useState("");
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [deliveryLabel, setDeliveryLabel] = useState("This month");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("pos-token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchStats = async () => {
      try {
        const { data } = await axios.get(`${API}/admin/stats`, { headers });
        setStats((prev) => ({ ...prev, ...data }));
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load stats.");
      }
    };

    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(`${API}/orders`, { headers });
        if (data?.summary) {
          setStats((prev) => ({
            ...prev,
            totalSales: data.summary.orderCount ?? prev.totalSales,
            orderVolume: data.summary.orderCount ?? prev.orderVolume,
            totalRevenue: data.summary.totalRevenue ?? prev.totalRevenue,
            avgOrderValue: data.summary.avgOrderValue ?? prev.avgOrderValue,
          }));
        }
      } catch (e) {
        setErr((p) => p || e?.response?.data?.message || e?.message || "Failed to load orders.");
      }
    };

    const fetchDeliveries = async () => {
      try {
        const { start, end, label } = deliveryRangeFor("month");
        const { data } = await axios.get(`${API}/delivery`, { headers });
        const list = Array.isArray(data?.deliveries) ? data.deliveries : Array.isArray(data) ? data : [];
        const filteredDeliveries = list.filter((delivery) => {
          const deliveryDate = new Date(delivery?.createdAt || delivery?.updatedAt);
          return deliveryDate >= start && deliveryDate <= end;
        });
        setDeliveries(filteredDeliveries);
      } catch (e) {
        console.warn("Deliveries fetch error:", e?.response?.data?.message || e?.message);
      }
    };

    const fetchProducts = async () => {
      try {
        const { data } = await axios.get(`${API}/products?page=1&limit=1000`, { headers });
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const getStock = (p) => Number(p?.stock ?? 0) || 0;
        const getMin = (p) => {
          const n = Number(p?.minStock ?? 0);
          return Number.isFinite(n) && n > 0 ? n : 10;
        };

        const out = items.filter((p) => getStock(p) <= 0).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        const outIds = new Set(out.map((p) => String(p._id)));

        const low = items
          .filter((p) => {
            const s = getStock(p);
            const m = getMin(p);
            return s > 0 && s < m;
          })
          .filter((p) => !outIds.has(String(p._id)))
          .sort((a, b) => getStock(a) - getStock(b));

        setLowStockItems(low);
        setOutOfStockItems(out);
        setStats((prev) => ({ ...prev, lowStock: low.length }));
      } catch (e) {
        setErr((p) => p || e?.response?.data?.message || e?.message || "Failed to load products.");
      }
    };

    const fetchLoyaltyData = async () => {
      try {
        const { data } = await axios.get(`${API}/loyalty/rewards`, { headers });
        
        const loyaltyRewards = Array.isArray(data) ? data 
          : data?.rewards || data?.data || [];
        
        if (!loyaltyRewards.length) {
          return;
        }

        const topLoyaltyUsers = loyaltyRewards
          .sort((a, b) => (b.points || 0) - (a.points || 0))
          .slice(0, 10)
          .map(reward => ({
            userId: reward.userId?._id || reward.userId,
            userName: reward.userId?.name || 'Unknown User',
            userEmail: reward.userId?.email || '',
            points: reward.points || 0,
            tier: reward.tier || '',
            totalSpent: reward.totalSpent || 0,
            purchaseCount: reward.purchaseCount || 0
          }));

        setStats(prev => ({
          ...prev,
          topLoyaltyUsers,
          allLoyaltyRewards: loyaltyRewards
        }));
        
      } catch (e) {
        console.error("❌ Loyalty data fetch error:", e?.response?.data || e?.message);
      }
    };

    fetchStats();
    fetchOrders();
    fetchDeliveries();
    fetchProducts();
    fetchLoyaltyData();
  }, []);

  useEffect(() => {
    const { start, end, label } = deliveryRangeFor("month");
    setDeliveryLabel(label);
    setDeliveryCount(countDeliveredInRange(deliveries, start, end));
  }, [deliveries]);

  const currentOption = VIEW_OPTIONS.find((opt) => opt.id === currentView);

  const handleViewChange = (viewId) => {
    setCurrentView(viewId);
    setDropdownOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case VIEWS.DASHBOARD:
        return (
          <DashboardView 
            stats={stats}
            err={err}
            lowStockItems={lowStockItems}
            outOfStockItems={outOfStockItems}
            deliveryCount={deliveryCount}
            deliveryLabel={deliveryLabel}
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
          />
        );
      case VIEWS.LOYALTY:
        return <Loyalty />;
      case VIEWS.SALES:
        return <SalesAnalyticsView />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with Dropdown */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              
              {/* Dropdown Button */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                >
                  <span className="text-lg">{currentOption?.icon}</span>
                  <span className="font-medium">{currentOption?.label}</span>
                  <FaChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setDropdownOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-20">
                      {VIEW_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => handleViewChange(option.id)}
                          className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                            currentView === option.id
                              ? "bg-indigo-50 border-l-4 border-indigo-500"
                              : "border-l-4 border-transparent"
                          }`}
                        >
                          <span
                            className={`text-xl mt-0.5 ${
                              currentView === option.id
                                ? "text-indigo-600"
                                : "text-gray-400"
                            }`}
                          >
                            {option.icon}
                          </span>
                          <div className="flex-1 text-left">
                            <p
                              className={`font-semibold ${
                                currentView === option.id
                                  ? "text-indigo-900"
                                  : "text-gray-900"
                              }`}
                            >
                              {option.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {option.description}
                            </p>
                          </div>
                          {currentView === option.id && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Optional: Additional header actions */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {currentOption?.description}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 transition-all duration-300">
        {renderView()}
      </div>

      {/* User History Modal */}
      {selectedUser && (
        <UserHistoryModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)}
          allRewards={stats.allLoyaltyRewards}
        />
      )}
    </div>
  );
}