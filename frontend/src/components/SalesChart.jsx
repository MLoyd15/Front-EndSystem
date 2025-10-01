import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
  Area,
  Bar,
} from "recharts";
import { VITE_API_BASE} from "../config"

const API = VITE_API_BASE;
const CURRENCY = "₱";

const COLORS = {
  revenue: "#6366f1",
  units: "#10b981",
  revenueGradient: "rgba(99, 102, 241, 0.1)",
  unitsGradient: "rgba(16, 185, 129, 0.1)",
  grid: "#f1f5f9",
  text: "#64748b",
  border: "#e2e8f0",
  background: "#ffffff"
};

export default function EnhancedSalesChart() {
  const [orders, setOrders] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [chartType, setChartType] = useState("line"); // line, area, bar

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`${API}/orders`, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
            'Content-Type': 'application/json'
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setOrders(data?.orders ?? []);
      } catch (e) {
        setError(e?.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const getDateKey = useCallback((isoDate) => {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    
    if (groupBy === "day") {
      return date.toISOString().split('T')[0];
    } else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    }
  }, [groupBy]);

    const processedData = useMemo(() => {
  const grouped = orders.reduce((acc, order) => {
    // ✅ Include ALL orders now (Pending included)
    const key = getDateKey(order?.createdAt);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = { 
        date: key, 
        revenue: 0, 
        units: 0,
        orderCount: 0,
        avgOrderValue: 0,
      };
    }
    
    // Use total or totalAmount field
    const orderTotal = Number(order.total || order.totalAmount || 0);
    acc[key].revenue += orderTotal;
    acc[key].orderCount += 1;
    
    // Handle both products and items arrays, and various quantity field names
    const items = order.products || order.items || [];

    if (acc[key].orderCount === 1) {
      console.log('Sample order:', { 
        status: order.status,
        items: items,
        isArray: Array.isArray(items),
        itemCount: items?.length 
      });
    }
    
    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = Number(item?.quantity || item?.qty || item?.amount || 0);
        acc[key].units += qty;

        if (acc[key].orderCount === 1) {
          console.log('Sample item:', { item, qty });
        }
      }
    }
    
    return acc;
  }, {});

  return Object.values(grouped)
    .map(item => ({
      ...item,
      avgOrderValue: item.orderCount > 0 ? item.revenue / item.orderCount : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}, [orders, getDateKey]);


  const metrics = useMemo(() => {
    const totalRevenue = processedData.reduce((sum, item) => sum + item.revenue, 0);
    const totalUnits = processedData.reduce((sum, item) => sum + item.units, 0);
    const totalOrders = processedData.reduce((sum, item) => sum + item.orderCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, totalUnits, totalOrders, avgOrderValue };
  }, [processedData]);

  const { maxRevenue, maxUnits } = useMemo(() => {
    let mr = 0, mu = 0;
    processedData.forEach(d => {
      if (d.revenue > mr) mr = d.revenue;
      if (d.units > mu) mu = d.units;
    });
    return { 
      maxRevenue: Math.ceil(mr * 1.1), 
      maxUnits: Math.ceil(mu * 1.1) 
    };
  }, [processedData]);

  const formatCurrency = useCallback((value) => {
    return `${CURRENCY}${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const formatDateLabel = useCallback((key) => {
    if (groupBy === "day") {
      const date = new Date(key);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      const date = new Date(`${key}-01`);
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  }, [groupBy]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const revenueData = payload.find(p => p.dataKey === 'revenue');
    const unitsData = payload.find(p => p.dataKey === 'units');
    const orderData = processedData.find(d => d.date === label);

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[280px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">
            {formatDateLabel(label)}
          </span>
        </div>
        
        <div className="space-y-2">
          {showRevenue && revenueData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Revenue</span>
              <span className="font-semibold text-indigo-600">
                {formatCurrency(revenueData.value)}
              </span>
            </div>
          )}
          
          {showUnits && unitsData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Units Sold</span>
              <span className="font-semibold text-emerald-600">
                {Number(unitsData.value).toLocaleString()}
              </span>
            </div>
          )}
          
          {orderData && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Orders</span>
                <span className="font-medium text-gray-800">
                  {orderData.orderCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Order Value</span>
                <span className="font-medium text-gray-800">
                  {formatCurrency(orderData.avgOrderValue)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, value, icon, color, trend }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
          <div className={`text-2xl ${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );

  if (loading) return <SkeletonChart />;
  if (error) return <ErrorState message={error} />;
  if (processedData.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          icon="💰"
          color="text-indigo-600"
        />
        <MetricCard
          title="Units Sold"
          value={metrics.totalUnits.toLocaleString()}
          icon="📦"
          color="text-emerald-600"
        />
        <MetricCard
          title="Total Orders"
          value={metrics.totalOrders.toLocaleString()}
          icon="🛒"
          color="text-blue-600"
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(metrics.avgOrderValue)}
          icon="📊"
          color="text-purple-600"
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Group by</label>
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Chart Type</label>
              <select
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
              >
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showRevenue
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setShowRevenue(!showRevenue)}
            >
              {showRevenue ? "Hide" : "Show"} Revenue
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showUnits
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setShowUnits(!showUnits)}
            >
              {showUnits ? "Hide" : "Show"} Units
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={processedData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              
              <XAxis
                dataKey="date"
                stroke={COLORS.text}
                tick={{ fontSize: 12, fill: COLORS.text }}
                tickFormatter={formatDateLabel}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              
              <YAxis
                yAxisId="left"
                stroke={COLORS.revenue}
                tick={{ fontSize: 12, fill: COLORS.text }}
                domain={[0, maxRevenue]}
                tickFormatter={formatCurrency}
              />
              
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={COLORS.units}
                tick={{ fontSize: 12, fill: COLORS.text }}
                domain={[0, maxUnits]}
                tickFormatter={(n) => Number(n).toLocaleString()}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                iconType="circle"
              />
              
              <ReferenceLine y={0} yAxisId="left" stroke={COLORS.grid} />

              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.revenue} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.revenue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="unitsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.units} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={COLORS.units} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Revenue visualization */}
              {showRevenue && (
                <>
                  {chartType === "area" && (
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="none" 
                      fill="url(#revenueGradient)" 
                    />
                  )}
                  {chartType === "bar" && (
                    <Bar 
                      yAxisId="left" 
                      dataKey="revenue" 
                      fill={COLORS.revenue}
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                  )}
                  {(chartType === "line" || chartType === "area") && (
                    <Line
                      yAxisId="left"
                      name="Revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.revenue}
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "white", strokeWidth: 2, fill: COLORS.revenue }}
                      activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    />
                  )}
                </>
              )}

              {/* Units visualization */}
              {showUnits && (
                <>
                  {chartType === "area" && (
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="units" 
                      stroke="none" 
                      fill="url(#unitsGradient)" 
                    />
                  )}
                  {chartType === "bar" && (
                    <Bar 
                      yAxisId="right" 
                      dataKey="units" 
                      fill={COLORS.units}
                      radius={[4, 4, 0, 0]}
                      opacity={0.8}
                    />
                  )}
                  {(chartType === "line" || chartType === "area") && (
                    <Line
                      yAxisId="right"
                      name="Units Sold"
                      type="monotone"
                      dataKey="units"
                      stroke={COLORS.units}
                      strokeWidth={3}
                      dot={{ r: 4, stroke: "white", strokeWidth: 2, fill: COLORS.units }}
                      activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                    />
                  )}
                </>
              )}

              <Brush 
                height={30} 
                travellerWidth={10} 
                stroke={COLORS.border} 
                fill="#f8fafc"
                dataKey="date"
                tickFormatter={formatDateLabel}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* Helper Components */
function SkeletonChart() {
  return (
    <div className="space-y-6">
      {/* Skeleton metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Skeleton controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
            <div className="h-10 w-32 bg-gray-200 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
            <div className="h-10 w-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      
      {/* Skeleton chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
        <div className="h-[500px] bg-gray-100 rounded-lg"></div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No sales data yet</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Start making sales to see your revenue and units sold trends over time.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-12">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-red-900 mb-2">Unable to load sales data</h3>
        <p className="text-red-600 mb-4">{message}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}