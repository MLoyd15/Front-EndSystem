// COMPLETE UPDATED AdminKpi.jsx with Loyalty Data from Users

import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaUsers, FaBoxes, FaExclamationTriangle, FaTruck, FaAward } from "react-icons/fa";
import SalesChart from "./SalesChart";
import { VITE_API_BASE } from "../config";

const API = VITE_API_BASE;
const CURRENCY = "₱";
const peso = (n) =>
  `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const ONE_DAY = 24 * 60 * 60 * 1000;

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

export default function AdminKpi() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCategories: 0,
    orderVolume: 0,
    avgOrderValue: 0,
    lowStock: 0,
    totalLoyaltyPoints: 0,
    avgLoyaltyPoints: 0,
    topLoyaltyUsers: [],
    loyaltyHistory: [],
    tierDistribution: {},
  });

  const [err, setErr] = useState("");
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [deliveryLabel, setDeliveryLabel] = useState("This month");

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

    // NEW: Fetch loyalty data from users
    const fetchLoyaltyData = async () => {
  try {
    // Fetch from loyaltyrewards collection
    const { data } = await axios.get(`${API}/loyaltyrewards`, { headers });
    const loyaltyRewards = Array.isArray(data) ? data : data?.loyaltyrewards || data?.rewards || [];
    
    // Calculate totals
    const totalLoyaltyPoints = loyaltyRewards.reduce((sum, reward) => sum + (Number(reward.points) || 0), 0);
    const totalSpent = loyaltyRewards.reduce((sum, reward) => sum + (Number(reward.totalSpent) || 0), 0);
    
    // Get top spenders
    const topSpenders = loyaltyRewards
      .filter(reward => (reward.totalSpent || 0) > 0)
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 10)
      .map(reward => ({
        userId: reward.userId || { name: "Unknown", email: "" },
        totalSpent: reward.totalSpent || 0,
        points: reward.points || 0,
        tier: reward.tier || 'Bronze'
      }));
    
    // Flatten points history from all loyalty records
    const loyaltyHistory = loyaltyRewards
      .filter(reward => reward.pointsHistory && reward.pointsHistory.length > 0)
      .flatMap(reward => 
        reward.pointsHistory.map(entry => ({
          ...entry,
          userName: reward.userId?.name || "Unknown",
          userEmail: reward.userId?.email || "",
          points: entry.points || 0,
          source: entry.source || "—",
          createdAt: entry.createdAt || new Date()
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);
    
    setStats(prev => ({
      ...prev,
      totalLoyaltyPoints,
      totalSpent,
      avgSpent: loyaltyRewards.length > 0 ? Math.round(totalSpent / loyaltyRewards.length) : 0,
      topSpenders,
      loyaltyHistory
    }));
  } catch (e) {
    console.warn("Loyalty data fetch error:", e?.response?.data?.message || e?.message);
  }
};

    fetchStats();
    fetchOrders();
    fetchDeliveries();
    fetchProducts();
    fetchLoyaltyData(); // Add this line
  }, []);

  useEffect(() => {
    const { start, end, label } = deliveryRangeFor("month");
    setDeliveryLabel(label);
    setDeliveryCount(countDeliveredInRange(deliveries, start, end));
  }, [deliveries]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
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

          <div className="space-y-4">
            <SectionHeader icon={<FaExclamationTriangle />} title="Stock Alerts" subtitle="Inventory warnings" />
            <StockAlertCard title="Low Stock" items={lowStockItems} type="low" />
            <StockAlertCard title="Out of Stock" items={outOfStockItems} type="out" />
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

          <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Recent Loyalty Activity</h2>
              <div className="text-sm text-gray-500">
                Total: <span className="font-semibold text-gray-800">{stats.totalLoyaltyPoints.toLocaleString()}</span> pts
              </div>
            </div>
            {stats.loyaltyHistory?.length ? (
              <ul className="divide-y divide-gray-100">
                {stats.loyaltyHistory.map((entry, i) => (
                  <li key={i} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{entry.user || "Unknown"}</span>
                      <span className="text-gray-400 text-xs ml-2">{entry.email || ""}</span>
                    </div>
                    <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs ring-1 ring-emerald-200">
                      {entry.action === 'redeem' ? '-' : '+'}{entry.points} pts
                    </span>
                    <span className="text-gray-500 ml-4">
                      {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <p className="text-gray-500">No loyalty activity yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}