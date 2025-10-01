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
import { VITE_API_BASE } from "../config";

const API = VITE_API_BASE;
const CURRENCY = "₱";

const COLORS = {
  revenue: "#6366f1",
  units: "#10b981",
  orderVolume: "#f59e0b",
  avgOrderValue: "#8b5cf6",
  revenueGradient: "rgba(99, 102, 241, 0.1)",
  unitsGradient: "rgba(16, 185, 129, 0.1)",
  orderVolumeGradient: "rgba(245, 158, 11, 0.1)",
  avgOrderValueGradient: "rgba(139, 92, 246, 0.1)",
  grid: "#f1f5f9",
  text: "#64748b",
  border: "#e2e8f0",
  background: "#ffffff",
};

const peso = (n) =>
  `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toIdString = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (v.$oid) return v.$oid;
  if (v._id) return toIdString(v._id);
  return String(v);
};

export default function EnhancedSalesChart() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showOrderVolume, setShowOrderVolume] = useState(false);
  const [showAvgOrderValue, setShowAvgOrderValue] = useState(false);
  const [chartType, setChartType] = useState("line"); // line | area | bar

  // for product name lookups
  const [productIndex, setProductIndex] = useState(new Map());

  useEffect(() => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
      "Content-Type": "application/json",
    };

    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/orders`, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const body = await res.json();
        setOrders(body?.orders ?? []);
      } catch (e) {
        setError(e?.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    };

    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API}/products?page=1&limit=1000`, { headers });
        if (!res.ok) return;
        const body = await res.json();
        const items = Array.isArray(body?.items) ? body.items : Array.isArray(body) ? body : [];
        const map = new Map();
        for (const p of items) {
          const id = toIdString(p?._id || p?.id);
          if (!id) continue;
          const name =
            p?.name ||
            p?.productName ||
            (id ? `Product ${id.slice(-6)}` : "Unknown Product");
          const category =
            p?.category?.name ||
            p?.category?.categoryName ||
            p?.categoryName ||
            p?.category ||
            "Uncategorized";
          map.set(id, { name, category });
        }
        setProductIndex(map);
      } catch {
        /* non-fatal */
      }
    };

    fetchOrders();
    fetchProducts();
  }, []);

  const getDateKey = useCallback(
    (isoDate) => {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return null;
      if (groupBy === "day") return date.toISOString().split("T")[0];
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    },
    [groupBy]
  );

  /* ---------- item/line helpers ---------- */
  const getItemsArray = (o) => {
    const candidates = [o?.products, o?.items, o?.orderItems, o?.cart?.items];
    for (const c of candidates) if (Array.isArray(c) && c.length) return c; // prefer non-empty
    for (const c of candidates) if (Array.isArray(c)) return c;
    return [];
  };

  const getProductId = (it) =>
    toIdString(it?.productId || it?.productid || it?.product?._id || it?._id || it?.id);

  const getProductName = (it) => {
    const id = getProductId(it);
    return (
      it?.name ||
      it?.product?.name ||
      productIndex.get(id)?.name ||
      (id ? `Product ${id.slice(-6)}` : "Unknown Product")
    );
  };

  const getQty = (it) => {
    const candidates = [
      it?.quantity,
      it?.qty,
      it?.units,
      it?.count,
      it?.pieces,
      it?.pcs,
      it?.weightKg,
      it?.kg,
      it?.weight,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    if (it?.product || it?.productId || it?.productid || it?.name || it?._id) return 1;
    return 0;
  };

  const getUnitPrice = (it) => {
    const candidates = [it?.price, it?.unitPrice, it?.product?.price, it?.finalPrice];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    if (Number.isFinite(Number(it?.amount))) {
      const a = Number(it.amount);
      return a > 1000 ? a / 100 : a; // centavos heuristic
    }
    return 0;
  };

  /* ---------- series data for chart ---------- */
  const processedData = useMemo(() => {
    const grouped = orders.reduce((acc, order) => {
      const key = getDateKey(order?.createdAt);
      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = { date: key, revenue: 0, units: 0, orderCount: 0, avgOrderValue: 0 };
      }

      const items = getItemsArray(order);

      // revenue
      let orderRevenue = Number(order?.total ?? order?.totalAmount);
      if (!Number.isFinite(orderRevenue)) {
        orderRevenue = items.reduce((s, it) => s + getUnitPrice(it) * getQty(it), 0);
      }
      acc[key].revenue += orderRevenue;
      acc[key].orderCount += 1;

      // units
      for (const it of items) acc[key].units += getQty(it);

      return acc;
    }, {});

    return Object.values(grouped)
      .map((row) => ({
        ...row,
        avgOrderValue: row.orderCount ? row.revenue / row.orderCount : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [orders, getDateKey]);

  /* ---------- KPIs ---------- */
  const metrics = useMemo(() => {
    const totalRevenue = processedData.reduce((s, d) => s + d.revenue, 0);
    const totalUnits = processedData.reduce((s, d) => s + d.units, 0);
    const totalOrders = processedData.reduce((s, d) => s + d.orderCount, 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalUnits, totalOrders, avgOrderValue };
  }, [processedData]);

  /* ---------- axis max ---------- */
  const { maxRevenue, maxUnits, maxOrderCount, maxAvgOrderValue } = useMemo(() => {
    let mr = 0, mu = 0, mo = 0, maov = 0;
    for (const d of processedData) {
      if (d.revenue > mr) mr = d.revenue;
      if (d.units > mu) mu = d.units;
      if (d.orderCount > mo) mo = d.orderCount;
      if (d.avgOrderValue > maov) maov = d.avgOrderValue;
    }
    return { 
      maxRevenue: Math.ceil(mr * 1.1), 
      maxUnits: Math.ceil(mu * 1.1),
      maxOrderCount: Math.ceil(mo * 1.1),
      maxAvgOrderValue: Math.ceil(maov * 1.1)
    };
  }, [processedData]);

  /* ---------- Top 5 Products (by units) ---------- */
  const topProductsByUnits = useMemo(() => {
    const stats = new Map(); // key -> { id, name, totalUnits, totalRevenue, orderCount }

    for (const order of orders) {
      const items = getItemsArray(order);
      for (const it of items) {
        const id = getProductId(it) || getProductName(it); // fallback to name
        const name = getProductName(it);
        const qty = getQty(it);
        const price = getUnitPrice(it);

        if (!stats.has(id)) stats.set(id, { id, name, totalUnits: 0, totalRevenue: 0, orderCount: 0 });
        const row = stats.get(id);
        row.totalUnits += qty;
        row.totalRevenue += qty * price;
        row.orderCount += 1;
      }
    }

    return [...stats.values()].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 5);
  }, [orders, productIndex]);

  /* ---------- formatters & small UI bits ---------- */
  const formatCurrency = useCallback((value) => peso(value), []);
  const formatDateLabel = useCallback((key) => {
    const date = key.length === 10 ? new Date(key) : new Date(`${key}-01`);
    return date.toLocaleDateString(undefined, key.length === 10 ? { month: "short", day: "numeric" } : { month: "short", year: "numeric" });
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const revenueData = payload.find((p) => p.dataKey === "revenue");
    const unitsData = payload.find((p) => p.dataKey === "units");
    const orderVolumeData = payload.find((p) => p.dataKey === "orderCount");
    const avgOrderData = payload.find((p) => p.dataKey === "avgOrderValue");
    const row = processedData.find((d) => d.date === label);

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[280px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-sm font-medium text-gray-900">{formatDateLabel(label)}</span>
        </div>
        <div className="space-y-2">
          {revenueData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Revenue</span>
              <span className="font-semibold text-indigo-600">{formatCurrency(revenueData.value)}</span>
            </div>
          )}
          {unitsData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Units Sold</span>
              <span className="font-semibold text-emerald-600">{Number(unitsData.value).toLocaleString()}</span>
            </div>
          )}
          {orderVolumeData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Order Volume</span>
              <span className="font-semibold text-amber-600">{Number(orderVolumeData.value).toLocaleString()}</span>
            </div>
          )}
          {avgOrderData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Order Value</span>
              <span className="font-semibold text-purple-600">{formatCurrency(avgOrderData.value)}</span>
            </div>
          )}
          {row && !orderVolumeData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Orders</span>
              <span className="font-medium text-gray-800">{row.orderCount}</span>
            </div>
          )}
          {row && !avgOrderData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Order Value</span>
              <span className="font-medium text-gray-800">{formatCurrency(row.avgOrderValue)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("600", "100")}`}>
          <div className={`text-2xl ${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} />;
  if (processedData.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon="💰" color="text-indigo-600" />
        <MetricCard title="Units Sold" value={metrics.totalUnits.toLocaleString()} icon="📦" color="text-emerald-600" />
        <MetricCard title="Total Orders" value={metrics.totalOrders.toLocaleString()} icon="🛒" color="text-blue-600" />
        <MetricCard title="Avg Order Value" value={formatCurrency(metrics.avgOrderValue)} icon="📊" color="text-purple-600" />
      </div>

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
                <option value="area">Area</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showRevenue ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setShowRevenue(!showRevenue)}
              >
                {showRevenue ? "Hide" : "Show"} Revenue
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showUnits ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setShowUnits(!showUnits)}
              >
                {showUnits ? "Hide" : "Show"} Units
              </button>

              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showOrderVolume ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setShowOrderVolume(!showOrderVolume)}
              >
                {showOrderVolume ? "Hide" : "Show"} Order Volume
              </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showAvgOrderValue ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setShowAvgOrderValue(!showAvgOrderValue)}
            >
              {showAvgOrderValue ? "Hide" : "Show"} Avg Order Value
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart - Revenue and Units */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Units Trend</h3>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
              <Legend wrapperStyle={{ paddingTop: 20 }} iconType="circle" />
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

              {/* Revenue */}
              {showRevenue && (
                <>
                  {chartType === "area" && (
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="none" fill="url(#revenueGradient)" />
                  )}
                  {chartType === "bar" && (
                    <Bar yAxisId="left" dataKey="revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} opacity={0.8} />
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

              {/* Units */}
              {showUnits && (
                <>
                  {chartType === "area" && (
                    <Area yAxisId="right" type="monotone" dataKey="units" stroke="none" fill="url(#unitsGradient)" />
                  )}
                  {chartType === "bar" && (
                    <Bar yAxisId="right" dataKey="units" fill={COLORS.units} radius={[4, 4, 0, 0]} opacity={0.8} />
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

              <Brush height={30} travellerWidth={10} stroke={COLORS.border} fill="#f8fafc" dataKey="date" tickFormatter={formatDateLabel} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Charts Side by Side - Order Volume and Avg Order Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Volume Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Volume</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                <YAxis stroke={COLORS.orderVolume} tick={{ fontSize: 12, fill: COLORS.text }} domain={[0, maxOrderCount]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} iconType="circle" />
                <defs>
                  <linearGradient id="orderVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.orderVolume} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.orderVolume} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {showOrderVolume && (
                  <>
                    {chartType === "area" && (
                      <Area type="monotone" dataKey="orderCount" stroke="none" fill="url(#orderVolumeGradient)" />
                    )}
                    {chartType === "bar" && (
                      <Bar dataKey="orderCount" fill={COLORS.orderVolume} radius={[4, 4, 0, 0]} opacity={0.8} />
                    )}
                    {(chartType === "line" || chartType === "area") && (
                      <Line
                        name="Order Volume"
                        type="monotone"
                        dataKey="orderCount"
                        stroke={COLORS.orderVolume}
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "white", strokeWidth: 2, fill: COLORS.orderVolume }}
                        activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                      />
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Order Value Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Order Value</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  stroke={COLORS.avgOrderValue}
                  tick={{ fontSize: 12, fill: COLORS.text }}
                  domain={[0, maxAvgOrderValue]}
                  tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 20 }} iconType="circle" />
                <ReferenceLine y={0} stroke={COLORS.grid} />
                <defs>
                  <linearGradient id="avgOrderValueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.avgOrderValue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={COLORS.avgOrderValue} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {showAvgOrderValue && (
                  <>
                    {chartType === "area" && (
                      <Area yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="none" fill="url(#avgOrderValueGradient)" />
                    )}
                    {chartType === "bar" && (
                      <Bar yAxisId="right" dataKey="avgOrderValue" fill={COLORS.avgOrderValue} radius={[4, 4, 0, 0]} opacity={0.8} />
                    )}
                    {(chartType === "line" || chartType === "area") && (
                      <Line
                        yAxisId="right"
                        name="Avg Order Value"
                        type="monotone"
                        dataKey="avgOrderValue"
                        stroke={COLORS.avgOrderValue}
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "white", strokeWidth: 2, fill: COLORS.avgOrderValue }}
                        activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
                      />
                    )}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

