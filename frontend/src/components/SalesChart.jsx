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
  revenueGradient: "rgba(99, 102, 241, 0.1)",
  unitsGradient: "rgba(16, 185, 129, 0.1)",
  grid: "#f1f5f9",
  text: "#64748b",
  border: "#e2e8f0",
  background: "#ffffff",
};

export default function EnhancedSalesChart() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [chartType, setChartType] = useState("line"); // line | area | bar

  // 🔎 index of products for name/category lookups: id -> { name, category }
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
          const id = String(p?._id || p?.id || "").trim();
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
        // ignore product fetch failures (we can still show chart)
      }
    };

    fetchOrders();
    fetchProducts();
  }, []);

  const getDateKey = useCallback(
    (isoDate) => {
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return null;
      if (groupBy === "day") {
        return date.toISOString().split("T")[0];
      } else {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${y}-${m}`;
      }
    },
    [groupBy]
  );

  // ---------- helpers to normalize item fields ----------

  const getItemsArray = (o) => {
  const candidates = [o?.products, o?.items, o?.orderItems, o?.cart?.items];

  // 1) Prefer the first non-empty array
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  // 2) If none are non-empty, return the first array we can find (even if empty)
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
};

  const getProductId = (it) =>
    String(it?.productId || it?.product?._id || it?._id || it?.id || "")
      .trim();

  const getProductName = (it) => {
    const id = getProductId(it);
    return (
      it?.name ||
      it?.product?.name ||
      productIndex.get(id)?.name ||
      (id ? `Product ${id.slice(-6)}` : "Unknown Product")
    );
  };

  const getCategoryName = (it) => {
    const inline =
      it?.category?.name ||
      it?.product?.category?.name ||
      it?.categoryName ||
      it?.product?.category;
    if (inline) return inline;

    const id = getProductId(it);
    return productIndex.get(id)?.category || "Uncategorized";
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
    // looks like a valid line but missing explicit qty → assume 1
    if (it?.product || it?.productId || it?.name || it?._id) return 1;
    return 0;
  };

  const getUnitPrice = (it) => {
    const candidates = [it?.price, it?.unitPrice, it?.product?.price, it?.finalPrice];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    // some payloads use "amount" in centavos
    if (Number.isFinite(Number(it?.amount))) {
      const a = Number(it.amount);
      return a > 1000 ? a / 100 : a; // heuristic
    }
    return 0;
  };

  // ---------- aggregate for chart ----------
 const processedData = useMemo(() => {
  const grouped = orders.reduce((acc, order) => {
    const key = getDateKey(order?.createdAt);
    if (!key) return acc;

    if (!acc[key]) {
      acc[key] = { date: key, revenue: 0, units: 0, orderCount: 0, avgOrderValue: 0 };
    }

    // ✅ pick items properly
    const items = getItemsArray(order);

    // 🔍 debug: see when nothing is picked
    if (items.length === 0) {
      console.log("No items picked for order", {
        createdAt: order?.createdAt,
        productsLen: Array.isArray(order?.products) ? order.products.length : null,
        itemsLen: Array.isArray(order?.items) ? order.items.length : null,
        orderItemsLen: Array.isArray(order?.orderItems) ? order.orderItems.length : null,
        cartItemsLen: Array.isArray(order?.cart?.items) ? order.cart.items.length : null,
      });
    }

    // revenue
    let orderRevenue = Number(order?.total ?? order?.totalAmount);
    if (!Number.isFinite(orderRevenue)) {
      orderRevenue = items.reduce((s, it) => s + getUnitPrice(it) * getQty(it), 0);
    }

    acc[key].revenue += orderRevenue;
    acc[key].orderCount += 1;

    // units
    for (const it of items) {
      acc[key].units += getQty(it);
    }

    return acc;
  }, {});

  return Object.values(grouped)
    .map((row) => ({
      ...row,
      avgOrderValue: row.orderCount ? row.revenue / row.orderCount : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}, [orders, getDateKey]);

  // ---------- KPI metrics ----------
  const metrics = useMemo(() => {
    const totalRevenue = processedData.reduce((s, d) => s + d.revenue, 0);
    const totalUnits = processedData.reduce((s, d) => s + d.units, 0);
    const totalOrders = processedData.reduce((s, d) => s + d.orderCount, 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalUnits, totalOrders, avgOrderValue };
  }, [processedData]);

  // ---------- chart axes max ----------
  const { maxRevenue, maxUnits } = useMemo(() => {
    let mr = 0,
      mu = 0;
    for (const d of processedData) {
      if (d.revenue > mr) mr = d.revenue;
      if (d.units > mu) mu = d.units;
    }
    return { maxRevenue: Math.ceil(mr * 1.1), maxUnits: Math.ceil(mu * 1.1) };
  }, [processedData]);

  // ---------- Top 5 Products (by units) ----------
  const topProductsByUnits = useMemo(() => {
    const stats = new Map(); // key -> { id, name, totalUnits, totalRevenue, orderCount }

    for (const order of orders) {
      const raw =
        order.products ?? order.items ?? order.orderItems ?? order.cart?.items ?? [];
      const items = Array.isArray(raw) ? raw : [];
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

  // ---------- Top 5 Categories (by revenue & by units) ----------
  const topCategories = useMemo(() => {
    const stats = new Map(); // name -> { name, totalRevenue, totalUnits, orderCount }

    for (const order of orders) {
      const raw =
        order.products ?? order.items ?? order.orderItems ?? order.cart?.items ?? [];
      const items = Array.isArray(raw) ? raw : [];
      for (const it of items) {
        const cat = getCategoryName(it);
        const qty = getQty(it);
        const price = getUnitPrice(it);
        const rev = qty * price;

        if (!stats.has(cat)) stats.set(cat, { name: cat, totalRevenue: 0, totalUnits: 0, orderCount: 0 });
        const row = stats.get(cat);
        row.totalRevenue += rev;
        row.totalUnits += qty;
        row.orderCount += 1;
      }
    }

    const all = [...stats.values()];
    return {
      byRevenue: [...all].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5),
      byUnits: [...all].sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 5),
    };
  }, [orders, productIndex]);

  // ---------- formatting helpers ----------
  const formatCurrency = useCallback((value) => {
    return `${CURRENCY}${Number(value ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  const formatDateLabel = useCallback(
    (key) => {
      if (groupBy === "day") {
        const date = new Date(key);
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      } else {
        const date = new Date(`${key}-01`);
        return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
      }
    },
    [groupBy]
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const revenueData = payload.find((p) => p.dataKey === "revenue");
    const unitsData = payload.find((p) => p.dataKey === "units");
    const orderData = processedData.find((d) => d.date === label);

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 min-w-[280px]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-900">{formatDateLabel(label)}</span>
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
                <span className="font-medium text-gray-800">{orderData.orderCount}</span>
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
          {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("600", "100")}`}>
          <div className={`text-2xl ${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );

  const RankCard = ({ title, subtitle, colorBadgeBg, icon, rows, type }) => {
    const maxValue =
      type === "revenue" ? rows?.[0]?.totalRevenue || 1 : rows?.[0]?.totalUnits || 1;

    const gradient = type === "revenue"
      ? "bg-gradient-to-r from-indigo-500 to-indigo-600"
      : "bg-gradient-to-r from-emerald-500 to-emerald-600";

    const valueText = (r) =>
      type === "revenue" ? formatCurrency(r.totalRevenue) : `${r.totalUnits.toLocaleString()} u`;

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg ${colorBadgeBg} flex items-center justify-center`}>
            <span className="text-xl">{icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        </div>

        <div className="space-y-1">
          {rows?.length ? (
            rows.map((r, idx) => {
              const value = type === "revenue" ? r.totalRevenue : r.totalUnits;
              const pct = (value / maxValue) * 100;
              const rankColors = {
                1: "from-yellow-400 to-yellow-500",
                2: "from-gray-300 to-gray-400",
                3: "from-orange-400 to-orange-500",
              };
              return (
                <div
                  key={`${r.name}-${idx}`}
                  className="group hover:bg-gray-50 rounded-lg p-4 transition-all border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${
                        rankColors[idx + 1] || "from-gray-200 to-gray-300"
                      } flex items-center justify-center shadow-sm`}
                    >
                      <span className="text-white font-bold text-sm">{idx + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                          {r.name}
                        </h4>
                        <span
                          className={`font-bold text-sm whitespace-nowrap ${
                            type === "revenue" ? "text-indigo-600" : "text-emerald-600"
                          }`}
                        >
                          {valueText(r)}
                        </span>
                      </div>

                      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full ${gradient}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {"orderCount" in r && <span>🧾 {r.orderCount} orders</span>}
                        {"totalUnits" in r && type === "revenue" && (
                          <span>📦 {r.totalUnits.toLocaleString()} u</span>
                        )}
                        {"totalRevenue" in r && type === "units" && (
                          <span>💰 {formatCurrency(r.totalRevenue)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📦</div>
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return <SkeletonChart />;
  if (error) return <ErrorState message={error} />;
  if (processedData.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon="💰" color="text-indigo-600" />
        <MetricCard title="Units Sold" value={metrics.totalUnits.toLocaleString()} icon="📦" color="text-emerald-600" />
        <MetricCard title="Total Orders" value={metrics.totalOrders.toLocaleString()} icon="🛒" color="text-blue-600" />
        <MetricCard title="Avg Order Value" value={formatCurrency(metrics.avgOrderValue)} icon="📊" color="text-purple-600" />
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
                <option value="area">Area</option>
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

      {/* Top 5 Products & Top 5 Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankCard
          title="Top 5 Products Sold"
          subtitle="Most units sold"
          colorBadgeBg="bg-emerald-100"
          icon="🏆"
          rows={topProductsByUnits}
          type="units"
        />

        <RankCard
          title="Top 5 Categories by Revenue"
          subtitle="Best performing categories (₱)"
          colorBadgeBg="bg-indigo-100"
          icon="🏷️"
          rows={topCategories.byRevenue}
          type="revenue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankCard
          title="Top 5 Categories by Units"
          subtitle="Most frequently sold categories"
          colorBadgeBg="bg-emerald-100"
          icon="📦"
          rows={topCategories.byUnits}
          type="units"
        />
      </div>
    </div>
  );
}

/* ---------- Helper UI states ---------- */
function SkeletonChart() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
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
