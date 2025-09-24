import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaUsers, FaDollarSign, FaShoppingCart, FaBoxes } from "react-icons/fa";
import SalesChart from "./SalesChart";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Legend } from "recharts";

/* ---------- KPI Card ---------- */
function KpiCard({ title, value, icon, color = "from-emerald-500 to-green-500" }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`h-1 w-full ${color.startsWith("bg-") ? color : `bg-gradient-to-r ${color}`}`} />
      <div className="p-4 flex items-center gap-4">
        <div className="shrink-0 rounded-xl bg-gray-50 ring-1 ring-black/5 p-3 text-lg text-gray-700">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
          <p className="truncate text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

const API = "http://localhost:5000/api";
const CURRENCY = "₱";
const peso = (n) => `${CURRENCY}${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function AdminKpi() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCategories: 0,
    inventorySales: 0,
    lowStock: 0,
    inventoryStock: 0,
    orderVolume: 0,
    avgOrderValue: 0,
    loyaltyPoints: 0,
    loyaltyTier: "Sprout",
    loyaltyHistory: [],
  });

  const [orders, setOrders] = useState([]);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [err, setErr] = useState("");
  const [rankBy, setRankBy] = useState("units"); // "units" | "revenue"

  /* local state for low/out-of-stock lists */
  const [lowStockItems, setLowStockItems] = useState([]);
  const [outOfStockItems, setOutOfStockItems] = useState([]);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("pos-token")}` };

    const fetchStats = async () => {
      try {
        const { data } = await axios.get(`${API}/admin/stats`, { headers });
        setStats((prev) => ({ ...prev, ...data }));
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load stats.");
      }
    };

    const fetchLoyalty = async () => {
        try {
          const { data } = await axios.get(`${API}/loyalty`, { headers });
          console.log("LOYALTY API RESPONSE:", data);   // 👀 check this
          setStats((prev) => ({
            ...prev,
            loyaltyPoints: data?.loyaltyPoints ?? 0,
            loyaltyTier: data?.loyaltyTier ?? "Sprout",
            loyaltyHistory: Array.isArray(data?.loyaltyHistory) ? data.loyaltyHistory : prev.loyaltyHistory,
          }));
        } catch (e) {
          console.error("Loyalty fetch error:", e);
        }
      };

    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(`${API}/orders`, { headers });
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
        if (data?.summary) {
          setStats((prev) => ({
            ...prev,
            totalSales: data.summary.orderCount ?? prev.totalSales,
            orderVolume: data.summary.orderCount ?? prev.orderVolume,
            totalRevenue: data.summary.totalRevenue ?? prev.totalRevenue,
            avgOrderValue: data.summary.avgOrderValue ?? prev.avgOrderValue,
          }));
          setSalesByCategory(data.summary.salesByCategory ?? []);
        }
      } catch (e) {
        setErr((p) => p || e?.response?.data?.message || e?.message || "Failed to load orders.");
      }
    };

    /* fetch products and compute low/out-of-stock */
    const fetchProducts = async () => {
      try {
      const { data } = await axios.get(`${API}/products?page=1&limit=1000`, { headers });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

    const getStock = (p) => {
      const n = Number(p?.stock ?? 0);
      return Number.isFinite(n) ? n : 0;
    };
    const getMin = (p) => {
      const n = Number(p?.minStock ?? 0);
      return Number.isFinite(n) && n > 0 ? n : 10;
    };

    const out = items
      .filter((p) => getStock(p) <= 0)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

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

    fetchStats();
    fetchLoyalty();
    fetchOrders();
    fetchProducts(); 
  }, []);

  /*Product summary */
  const productSummary = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      for (const it of o?.products ?? []) {
        const pid = String(
          it?.product?._id ?? it?.product ?? it?.productId ?? it?._id ?? ""
        ).trim();

        const qty = Number(it?.quantity ?? 0) || 0;
        const unitPrice = Number(it?.price ?? it?.product?.price ?? 0) || 0;
        const name =
          it?.product?.name ?? it?.name ?? (pid ? `Product ${pid.slice(-6)}` : "Unknown Product");

        const key = pid || `name:${name}`;
        const row = map.get(key) || { productId: pid || null, name, units: 0, revenue: 0 };
        row.units += qty;
        row.revenue += qty * unitPrice;
        if (row.name === "Unknown Product" && name) row.name = name;

        map.set(key, row);
      }
    }
    return Array.from(map.values());
  }, [orders]);

  const rankedTop5 = useMemo(() => {
    const sorted = [...productSummary].sort((a, b) =>
      rankBy === "units" ? b.units - a.units : b.revenue - a.revenue
    );
    return sorted.slice(0, 5);
  }, [productSummary, rankBy]);

  const totalCatRevenue = useMemo(
    () => (salesByCategory || []).reduce((s, x) => s + Number(x?.revenue || 0), 0),
    [salesByCategory]
  );

  // Colorway for Categories
  const makeShades = (count, { h = 120, s = 60, lMin = 35, lMax = 70 } = {}) => {
    if (count <= 0) return [];
    if (count === 1) return [`hsl(${h} ${s}% ${(lMin + lMax) / 2}%)`];
    const step = (lMax - lMin) / Math.max(1, count - 1);
    return Array.from({ length: count }, (_, i) => `hsl(${h} ${s}% ${lMax - i * step}%)`);
  };

  // generate green shades for however many categories exist
  const shades = makeShades((salesByCategory || []).length, { h: 120, s: 60, lMin: 35, lMax: 70 });

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* LEFT COLUMN: KPIs + Inventory */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Dashboard Overview</h2>
          {err && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            <KpiCard title="Total Users" value={stats.totalUsers} icon={<FaUsers />} />
            <KpiCard title="Total Sales" value={stats.totalSales} icon={<FaShoppingCart />} color="bg-green-500" />
            <KpiCard title="Total Revenue" value={peso(stats.totalRevenue)} icon={<FaDollarSign />} color="bg-green-500" />
            <KpiCard title="Order Volume" value={stats.orderVolume} icon={<FaShoppingCart />} color="bg-green-500" />
            <KpiCard title="Avg Order Value" value={peso(stats.avgOrderValue)} icon={<FaDollarSign />} color="bg-green-500" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Inventory Details</h2>
          <div className="grid grid-cols-1 gap-4">
            <KpiCard title="Total Categories" value={stats.totalCategories} icon={<FaBoxes />} color="bg-green-500" />
            <KpiCard title="Inventory Sales" value={stats.inventorySales} icon={<FaShoppingCart />} color="bg-green-500" />
            <KpiCard title="Low Stock" value={stats.lowStock} icon={<FaBoxes />} color="bg-green-500" />
          </div>
        </div>

        {/* ✅ Stock Alerts (Low Stock only) */}
      <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">⚠️ Stock Alerts</h3>
          {/* ⬇️ show only low stock count */}
          <span className="text-xs text-gray-500">
            {lowStockItems.length} low
          </span>
        </div>

        {/* Low Stock */}
        <div className="mb-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Low Stock
          </div>
          {lowStockItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
              No low stock items.
            </div>
          ) : (
            <ul className="space-y-2">
              {lowStockItems.slice(0, 5).map((p) => (
                <li key={p._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="truncate text-sm text-gray-800">{p.name ?? "Unnamed Product"}</span>
                  <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                    {Number(p?.stock ?? 0)} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

          {/* Out of Stock */}
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Out of Stock (0)</div>
            {outOfStockItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                No out of stock items.
              </div>
            ) : (
              <ul className="space-y-2">
                {outOfStockItems.slice(0, 5).map((p) => (
                  <li key={p._id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="truncate text-sm text-gray-800">{p.name ?? "Unnamed Product"}</span>
                    <span className="text-xs rounded-full bg-rose-50 text-rose-700 px-2 py-0.5 ring-1 ring-rose-200">
                      OOS
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="lg:col-span-3 space-y-6">
        {/* Sales Chart at top */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">📊 Sales Trends (Revenue & Units Sold)</h3>
          </div>
          <div className="rounded-xl border border-gray-100 p-2">
            <SalesChart />
          </div>
        </div>

        {/*op 5 + Sales By Category */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">🏆 Top 5 Products</h3>
              <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
                <button
                  className={`px-2.5 py-1 ${rankBy === "units" ? "bg-emerald-50 text-emerald-700" : "bg-white text-gray-600"}`}
                  onClick={() => setRankBy("units")}
                >
                  By Units
                </button>
                <button
                  className={`px-2.5 py-1 border-l border-gray-200 ${rankBy === "revenue" ? "bg-emerald-50 text-emerald-700" : "bg-white text-gray-600"}`}
                  onClick={() => setRankBy("revenue")}
                >
                  By Sales
                </button>
              </div>
            </div>

            {!rankedTop5.length ? (
              <p className="text-gray-500 text-sm">No sales yet.</p>
            ) : (
              <ul className="space-y-2">
                {rankedTop5.map((p, idx) => (
                  <li
                    key={(p.productId || p.name || idx) + "_top"}
                    className="border rounded-lg px-3 py-2 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] font-bold text-gray-500 w-4 text-center">{idx + 1}</span>
                        <span className="font-medium text-gray-800 text-sm truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                          {Number(p.units).toLocaleString()} u
                        </span>
                        <span className="text-[11px] rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                          {peso(p.revenue)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sales By Category*/}
          <div className="xl:col-span-2 rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🏷️ Sales By Category</h3>

            {!salesByCategory?.length ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
                No category sales yet.
              </div>
            ) : (
              <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Donut */}
                <div className="lg:col-span-3 h-[22rem] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(function () {
                          const total = totalCatRevenue || 0;
                          return (salesByCategory || [])
                            .map((d, i) => {
                              const value = Number(d?.revenue || 0);
                              return {
                                label: d?.category || "Uncategorized",
                                value,
                                percent: total ? value / total : 0,
                                color: shades[i],
                              };  
                            })
                            .sort((a, b) => b.value - a.value);
                        })()}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={100}
                        outerRadius={170}
                        paddingAngle={2}
                        cornerRadius={10}
                        stroke="#0f172a"
                        strokeOpacity={0.08}
                        labelLine={false}
                        label={({ percent }) =>
                          salesByCategory.length > 1 && percent >= 0.07
                            ? `${(percent * 100).toFixed(0)}%`
                            : null
                        }
                      >
                        {salesByCategory.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={shades[i]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const p = payload[0]?.payload || {};
                          return (
                            <div className="rounded-lg bg-white/90 backdrop-blur px-3 py-2 text-sm shadow ring-1 ring-black/5">
                              <div className="font-medium text-gray-900">{p.label}</div>
                              <div className="text-gray-600">
                                {peso(p.value)} • {(p.percent * 100).toFixed(1)}%
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center total */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Total</div>
                      <div className="text-2xl font-bold text-gray-800">
                        {peso(totalCatRevenue)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="lg:col-span-2 self-center">
                  <ul className="space-y-3">
                    {(function () {
                      const total = totalCatRevenue || 0;
                      return (salesByCategory || [])
                        .map((d, i) => {
                          const value = Number(d?.revenue || 0);
                          const pct = total ? (value / total) * 100 : 0;
                          return {
                            label: d?.category || "Uncategorized",
                            value,
                            pct,
                            color: shades[i],
                          };
                        })
                        .sort((a, b) => b.value - a.value)
                        .map((it, i) => (
                          <li
                            key={`legend-${i}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                className="inline-block h-3 w-3 rounded"
                                style={{ background: it.color }}
                                aria-hidden
                              />
                              <span className="truncate text-sm text-gray-800">
                                {it.label}
                              </span>
                            </div>
                            <div className="shrink-0 text-sm tabular-nums text-gray-700">
                              {it.pct.toFixed(1)}% • {peso(it.value)}
                            </div>
                          </li>
                        ));
                    })()}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Loyalty History */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">🎁 Loyalty History</h2>
            <div className="text-sm text-gray-500">
              Tier: <span className="font-semibold text-gray-800">{stats.loyaltyTier}</span> •{" "}
              Points:{" "}
              <span className="font-semibold text-gray-800">
                {Number(stats.loyaltyPoints || 0).toLocaleString()}
              </span>
            </div>
          </div>
          {stats.loyaltyHistory?.length ? (
            <ul className="divide-y divide-gray-100">
              {stats.loyaltyHistory.map((entry, i) => (
                <li key={i} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-800">{entry.action?.toUpperCase()}</span>
                  <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs ring-1 ring-emerald-200">
                    {entry.points} pts
                  </span>
                  <span className="text-gray-500">{new Date(entry.date).toLocaleDateString()}</span>
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
  );
}