import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart,
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
  // NEW: Donut chart pieces
  PieChart,
  Pie,
} from "recharts";

const API = "http://localhost:5000/api";
const CURRENCY = "₱"; // change to "$" if you prefer

function SalesChart() {
  const [orders, setOrders] = useState([]);
  const [data, setData] = useState([]);
  // REMOVED: const [topProducts, setTopProducts] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]); // NEW
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showUnits, setShowUnits] = useState(true);

  // fetch orders (+ category summary)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await axios.get(`${API}/orders`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
        });
        setOrders(res.data?.orders ?? []);
        setSalesByCategory(res.data?.summary?.salesByCategory ?? []); // NEW
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load orders.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // transform to daily series (YYYY-MM-DD for stable sort)
  useEffect(() => {
    const grouped = orders.reduce((acc, order) => {
      if (!order?.createdAt) return acc;
      const key = new Date(order.createdAt).toLocaleDateString("en-CA"); // 2025-09-09
      if (!acc[key]) acc[key] = { revenue: 0, units: 0 };
      acc[key].revenue += Number(order.totalAmount || 0);
      for (const p of order.products || []) acc[key].units += Number(p?.quantity || 0);
      return acc;
    }, {});
    const rows = Object.keys(grouped)
      .sort()
      .map((date) => ({ date, ...grouped[date] }));
    setData(rows);
  }, [orders]);

  // REMOVED: client-side Top 5 computation useEffect

  // nice headroom for axes
  const { maxRevenue, maxUnits } = useMemo(() => {
    let mr = 0, mu = 0;
    for (const d of data) {
      if (d.revenue > mr) mr = d.revenue;
      if (d.units > mu) mu = d.units;
    }
    return { maxRevenue: Math.ceil(mr * 1.15), maxUnits: Math.ceil(mu * 1.15) };
  }, [data]);

  // NEW: total for donut center label
  const totalCatRevenue = useMemo(
    () => (salesByCategory || []).reduce((s, x) => s + Number(x?.revenue || 0), 0),
    [salesByCategory]
  );

  const fmtMoney = (n) =>
    `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const byKey = Object.fromEntries(payload.map((p) => [p.dataKey, p]));
    return (
      <div className="rounded-xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur p-3 min-w-[220px]">
        <p className="text-xs text-gray-500 mb-2">{label}</p>
        {showRevenue && byKey.revenue && (
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-500" />
              Revenue
            </span>
            <span className="font-medium">{fmtMoney(byKey.revenue.value)}</span>
          </div>
        )}
        {showUnits && byKey.units && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Units Sold
            </span>
            <span className="font-medium">
              {Number(byKey.units.value ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-10">
      {/* Chart (80%) */}
      <div className="lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border-4 border-green-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            📊 Sales Trends (Revenue & Units Sold)
          </h2>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                showRevenue
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
              onClick={() => setShowRevenue((v) => !v)}
            >
              {showRevenue ? "Hide" : "Show"} Revenue
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                showUnits
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-white border-gray-200 text-gray-600"
              }`}
              onClick={() => setShowUnits((v) => !v)}
            >
              {showUnits ? "Hide" : "Show"} Units
            </button>
          </div>
        </div>

        <div className="h-[420px]" id="sales-chart-container">
          {loading && <SkeletonChart />}
          {!loading && err && <ErrorState message={err} />}
          {!loading && !err && data.length === 0 && <EmptyState />}
          {!loading && !err && data.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  domain={[0, maxRevenue]}
                  tickFormatter={fmtMoney}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                  domain={[0, maxUnits]}
                  tickFormatter={(n) => Number(n).toLocaleString()}
                />

                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <ReferenceLine y={0} yAxisId="left" stroke="#e5e7eb" />

                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="unitsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {showRevenue && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="none"
                    fill="url(#revGrad)"
                    isAnimationActive
                    legendType="none"
                  />
                )}
                {showUnits && (
                  <Bar
                    yAxisId="right"
                    dataKey="units"
                    barSize={6}
                    radius={[8, 8, 0, 0]}
                    fill="url(#unitsGrad)"
                    legendType="none"
                  />
                )}

                {showRevenue && (
                  <Line
                    yAxisId="left"
                    name="Revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 3, stroke: "white", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                )}
                {showUnits && (
                  <Line
                    yAxisId="right"
                    name="Units Sold"
                    type="monotone"
                    dataKey="units"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, stroke: "white", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                )}

                <Brush height={24} travellerWidth={8} stroke="#c7d2fe" fill="#f8fafc" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Right panel: Sales By Category (donut) — replaces Top 5 Products */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-md p-6 border-4 border-green-500">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🏷️ Sales By Category</h3>

        {loading && <p className="text-gray-500">Loading...</p>}
        {!loading && !err && (!salesByCategory || salesByCategory.length === 0) && (
          <p className="text-gray-500">No category sales yet.</p>
        )}

        {!loading && !err && salesByCategory && salesByCategory.length > 0 && (
          <div className="h-72 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCategory}
                  dataKey="revenue"       // change to "units" if you want units
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={105}
                  stroke="#0f172a"
                  strokeOpacity={0.1}
                  isAnimationActive
                />
                <Tooltip
                  formatter={(value, _k, item) => [
                    fmtMoney(value),
                    item?.payload?.category,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* center total */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-xl font-bold text-gray-800">
                  {fmtMoney(totalCatRevenue)}
                </div>
              </div>
            </div>

            {/* simple legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 justify-center">
              {salesByCategory.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: `hsl(${(i * 60) % 360} 80% 50%)` }}
                  />
                  <span>{d.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && err && (
          <p className="text-sm text-red-600">Failed to load categories: {err}</p>
        )}
      </div>
    </div>
  );
}

/* small UI helpers */
function SkeletonChart() {
  return (
    <div className="h-full animate-pulse">
      <div className="h-7 w-1/3 bg-gray-200 rounded-lg mb-4" />
      <div className="h-[320px] bg-gray-100 rounded-xl" />
      <div className="h-6 w-1/2 bg-gray-100 rounded-lg mt-4" />
    </div>
  );
}
function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">🕳️</div>
        <p className="text-gray-600 font-medium">No data yet</p>
        <p className="text-gray-400 text-sm">Add sales to see trends over time.</p>
      </div>
    </div>
  );
}
function ErrorState({ message }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">⚠️</div>
        <p className="text-gray-700 font-medium">Couldn’t load sales</p>
        <p className="text-gray-500 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

export default SalesChart;