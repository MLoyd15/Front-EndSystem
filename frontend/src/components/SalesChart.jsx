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
  target: "#ef4444",
  revenueGradient: "rgba(99, 102, 241, 0.1)",
  unitsGradient: "rgba(16, 185, 129, 0.1)",
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

// ============================================================================
// SIMPLE RECEIPT COMPONENT
// ============================================================================
const SimpleReceipt = ({ orderData, onClose }) => {
  if (!orderData) return null;

  const items = Array.isArray(orderData.items) ? orderData.items : [];
  const subtotal = Number(
    orderData.subtotal ??
      items.reduce((sum, it) => sum + (Number(it.price ?? 0) * Number(it.quantity ?? 1)), 0)
  );
  const deliveryFee = Number(orderData.deliveryFee ?? 0);
  const total = Number(orderData.total ?? subtotal + deliveryFee);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${month} ${day}, ${year} at ${h12}:${minutes} ${ampm}`;
  };

  const handlePrint = () => {
    const printWindow = window.open('', 'PRINT', 'width=400,height=600');
    
    if (!printWindow) {
      alert('Please allow pop-ups for printing receipts');
      return;
    }
    
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - Order #${String(orderData._id || orderData.id).slice(-12)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            line-height: 1.5;
            color: #000;
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 20px;
            margin-bottom: 5px;
            font-weight: bold;
          }
          .header p {
            font-size: 10px;
          }
          .order-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .divider {
            border-top: 2px dashed #000;
            margin: 15px 0;
          }
          table {
            width: 100%;
            font-size: 11px;
            border-collapse: collapse;
          }
          th {
            text-align: left;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            font-weight: bold;
          }
          th:nth-child(2) { text-align: center; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          td {
            padding: 5px 0;
            border-bottom: 1px solid #ddd;
          }
          td:nth-child(2) { text-align: center; }
          td:nth-child(3), td:nth-child(4) { text-align: right; }
          .totals {
            margin: 15px 0;
            font-size: 11px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 20px;
            font-size: 10px;
          }
          @media print {
            body { 
              margin: 0; 
              padding: 0;
            }
            @page {
              margin: 0;
              size: 80mm 297mm;
            }
          }
        </style>
      </head>
      <body onload="window.print(); window.onafterprint = function(){ window.close(); }">
        <div class="header">
          <h1>YOUR STORE NAME</h1>
          <p>123 Store Address</p>
          <p>Contact: (123) 456-7890</p>
        </div>
        
        <div class="order-info">
          <div class="info-row">
            <span>Order ID:</span>
            <strong>#${String(orderData._id || orderData.id).slice(-12)}</strong>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${formatDate(orderData.createdAt)}</span>
          </div>
          <div class="info-row">
            <span>Payment:</span>
            <span>${orderData.paymentMethod || "N/A"}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => {
              const name = it.name || it.productName || it.product?.name || "Item";
              const qty = Number(it.quantity || it.qty || 1);
              const price = Number(it.price || it.unitPrice || it.product?.price || 0);
              const itemTotal = price * qty;
              return `
                <tr>
                  <td>${name}</td>
                  <td>${qty}</td>
                  <td>${peso(price)}</td>
                  <td><strong>${peso(itemTotal)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="divider"></div>
        
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${peso(subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Delivery Fee:</span>
            <span>${deliveryFee === 0 ? "FREE" : peso(deliveryFee)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL:</span>
            <span>${peso(total)}</span>
          </div>
        </div>
        
        ${orderData.address ? `
          <div class="divider"></div>
          <div style="font-size: 11px;">
            <strong>Delivery Address:</strong><br>
            ${orderData.address}
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your order!</p>
          <p>Please come again</p>
        </div>
        
        <script>
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          }, 250);
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Receipt Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-6">
          <div className="border-2 border-gray-300 rounded-lg p-6 bg-white" style={{ fontFamily: "'Courier New', monospace" }}>
            {/* Store Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-4">
              <h1 className="text-xl font-bold mb-1">YOUR STORE NAME</h1>
              <p className="text-xs">123 Store Address</p>
              <p className="text-xs">Contact: (123) 456-7890</p>
            </div>

            {/* Order Info */}
            <div className="mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <strong>#{String(orderData._id || orderData.id).slice(-12)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{formatDate(orderData.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span>{orderData.paymentMethod || "N/A"}</span>
              </div>
            </div>

            <div className="border-t-2 border-dashed border-black my-3"></div>

            {/* Items Table */}
            <div className="mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-2">Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const name = it.name || it.productName || it.product?.name || "Item";
                    const qty = Number(it.quantity || it.qty || 1);
                    const price = Number(it.price || it.unitPrice || it.product?.price || 0);
                    const itemTotal = price * qty;
                    
                    return (
                      <tr key={i} className="border-b border-gray-300">
                        <td className="py-2">{name}</td>
                        <td className="text-center">{qty}</td>
                        <td className="text-right">{peso(price)}</td>
                        <td className="text-right font-bold">{peso(itemTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-dashed border-black my-3"></div>

            {/* Totals */}
            <div className="text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{peso(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee:</span>
                <span>{deliveryFee === 0 ? "FREE" : peso(deliveryFee)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t-2 border-black pt-2">
                <span>TOTAL:</span>
                <span>{peso(total)}</span>
              </div>
            </div>

            {/* Delivery Address */}
            {orderData.address && (
              <>
                <div className="border-t-2 border-dashed border-black my-3"></div>
                <div className="text-xs">
                  <p className="font-bold mb-1">Delivery Address:</p>
                  <p>{orderData.address}</p>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="text-center mt-4 pt-3 border-t-2 border-black text-xs">
              <p className="mb-1">Thank you for your order!</p>
              <p>Please come again</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 border-t">
          <button
            onClick={handlePrint}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED SALES CHART COMPONENT WITH AUTO 5% TARGETS
// ============================================================================
export default function EnhancedSalesChart() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("day");
  const [showRevenue, setShowRevenue] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [chartType, setChartType] = useState("line");
  const [productIndex, setProductIndex] = useState(new Map());
  
  // Receipt state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: landscape;
          margin: 0.4in;
        }
        
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        
        body * {
          visibility: hidden !important;
        }
        
        #printable-sales-report,
        #printable-sales-report * {
          visibility: visible !important;
        }
        
        #printable-sales-report {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          transform: scale(0.85);
          transform-origin: top left;
        }
        
        /* KPI cards styling */
        #printable-sales-report > div:first-child {
          margin-bottom: 1rem !important;
          page-break-inside: avoid !important;
        }
        
        #printable-sales-report .metric-card {
          page-break-inside: avoid !important;
        }
        
        /* Chart container */
        #printable-sales-report .chart-container {
          height: 400px !important;
          page-break-inside: avoid !important;
        }
        
        #printable-sales-report .chart-container > div {
          height: 400px !important;
        }
        
        .no-print {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Hide Brush and Legend in print to prevent extra pages */
        #printable-sales-report .recharts-brush,
        #printable-sales-report .recharts-legend-wrapper {
          display: none !important;
          visibility: hidden !important;
        }
        
        /* Prevent page breaks */
        #printable-sales-report,
        #printable-sales-report > * {
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          page-break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
      if (groupBy === "year") return String(y);
      const m = String(date.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    },
    [groupBy]
  );

  const getItemsArray = (o) => {
    const candidates = [o?.products, o?.items, o?.orderItems, o?.cart?.items];
    for (const c of candidates) if (Array.isArray(c) && c.length) return c;
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
      return a > 1000 ? a / 100 : a;
    }
    return 0;
  };

  const processedData = useMemo(() => {
    const grouped = orders.reduce((acc, order) => {
      const key = getDateKey(order?.createdAt);
      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = { date: key, revenue: 0, units: 0, orderCount: 0, avgOrderValue: 0 };
      }

      const items = getItemsArray(order);

      let orderRevenue = Number(order?.total ?? order?.totalAmount);
      if (!Number.isFinite(orderRevenue)) {
        orderRevenue = items.reduce((s, it) => s + getUnitPrice(it) * getQty(it), 0);
      }
      acc[key].revenue += orderRevenue;
      acc[key].orderCount += 1;

      for (const it of items) acc[key].units += getQty(it);

      return acc;
    }, {});

    const sortedData = Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row, idx, arr) => {
        // Calculate target: 5% higher than previous period's revenue
        let target = null;
        if (idx === 0) {
          // First period: target is 5% higher than its own revenue
          target = row.revenue * 1.05;
        } else {
          // Subsequent periods: 5% higher than previous period's actual revenue
          target = arr[idx - 1].revenue * 1.05;
        }

        return {
          ...row,
          avgOrderValue: row.orderCount ? row.revenue / row.orderCount : 0,
          target: target,
        };
      });

    return sortedData;
  }, [orders, getDateKey]);

  const metrics = useMemo(() => {
    const totalRevenue = processedData.reduce((s, d) => s + d.revenue, 0);
    const totalUnits = processedData.reduce((s, d) => s + d.units, 0);
    const totalOrders = processedData.reduce((s, d) => s + d.orderCount, 0);
    const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;
    
    // Calculate target achievement
    const totalTarget = processedData.reduce((s, d) => s + (d.target || 0), 0);
    const targetAchievement = totalTarget > 0 ? (totalRevenue / totalTarget) * 100 : 0;
    
    return { totalRevenue, totalUnits, totalOrders, avgOrderValue, targetAchievement };
  }, [processedData]);

  const { maxRevenue, maxUnits } = useMemo(() => {
    let mr = 0, mu = 0;
    for (const d of processedData) {
      const maxVal = Math.max(d.revenue, d.target || 0);
      if (maxVal > mr) mr = maxVal;
      if (d.units > mu) mu = d.units;
    }
    return { maxRevenue: Math.ceil(mr * 1.1), maxUnits: Math.ceil(mu * 1.1) };
  }, [processedData]);

  const topProductsByUnits = useMemo(() => {
    const stats = new Map();

    for (const order of orders) {
      const items = getItemsArray(order);
      for (const it of items) {
        const id = getProductId(it) || getProductName(it);
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

  const formatCurrency = useCallback((value) => peso(value), []);

  const formatDateLabel = useCallback((key) => {
    if (key.length === 4 && !isNaN(key)) {
      return key;
    }
    const date = key.length === 10 ? new Date(key) : new Date(`${key}-01`);
    return date.toLocaleDateString(undefined, key.length === 10 ? { month: "short", day: "numeric" } : { month: "short", year: "numeric" });
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const revenueData = payload.find((p) => p.dataKey === "revenue");
    const unitsData = payload.find((p) => p.dataKey === "units");
    const targetData = payload.find((p) => p.dataKey === "target");
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
          {targetData && targetData.value && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Target</span>
              <span className="font-semibold text-red-600">{formatCurrency(targetData.value)}</span>
            </div>
          )}
          {unitsData && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Units Sold</span>
              <span className="font-semibold text-emerald-600">{Number(unitsData.value).toLocaleString()}</span>
            </div>
          )}
          {row && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Orders</span>
                <span className="font-medium text-gray-800">{row.orderCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Order Value</span>
                <span className="font-medium text-gray-800">{formatCurrency(row.avgOrderValue)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const MetricCard = ({ title, value, icon, color, aside }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1 metric-title">{title}</p>
          <p className={`text-2xl font-bold ${color} flex items-baseline gap-2 metric-value`}>
            <span>{value}</span>
            {aside && (
              <span className="text-xs font-medium text-gray-700 bg-gray-100 ring-1 ring-gray-200 px-2 py-0.5 rounded-full">
                {aside}
              </span>
            )}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${color.replace("text-", "bg-").replace("600", "100")}`}>
          <div className={`text-2xl ${color}`}>{icon}</div>
        </div>
      </div>
    </div>
  );

  const ProductRankCard = ({ product, rank }) => {
    const maxUnits = topProductsByUnits[0]?.totalUnits || 1;
    const pct = (product.totalUnits / maxUnits) * 100;
    const rankColors = {
      1: "from-yellow-400 to-yellow-500",
      2: "from-gray-300 to-gray-400",
      3: "from-orange-400 to-orange-500",
    };
    return (
      <div className="group hover:bg-gray-50 rounded-lg p-4 transition-all border border-transparent hover:border-gray-200">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${rankColors[rank] || "from-gray-200 to-gray-300"} flex items-center justify-center shadow-sm`}>
            <span className="text-white font-bold text-sm">{rank}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                {product.name}
              </h4>
              <span className="font-bold text-sm whitespace-nowrap text-emerald-600">
                {product.totalUnits.toLocaleString()} u
              </span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>🧾 {product.orderCount} orders</span>
              <span>💰 {peso(product.totalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleShowReceipt = (orderId) => {
    const order = orders.find(o => (o._id || o.id) === orderId);
    if (order) {
      setSelectedOrder(order);
      setShowReceipt(true);
    }
  };

  if (loading) return <SkeletonChart />;
  if (error) return <ErrorState message={error} />;
  if (processedData.length === 0) return <EmptyState />;

  return (
    <>
      {/* Receipt Modal */}
      {showReceipt && selectedOrder && (
        <SimpleReceipt
          orderData={selectedOrder}
          onClose={() => {
            setShowReceipt(false);
            setSelectedOrder(null);
          }}
        />
      )}

      <div className="space-y-6">
        <div id="printable-sales-report" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="metric-card">
              <MetricCard title="Total Revenue" value={formatCurrency(metrics.totalRevenue)} icon="💰" color="text-indigo-600" />
            </div>
            <div className="metric-card">
              <MetricCard title="Units Sold" value={metrics.totalUnits.toLocaleString()} icon="📦" color="text-emerald-600" />
            </div>
            <div className="metric-card">
              <MetricCard title="Order Volume" value={metrics.totalOrders.toLocaleString()} icon="🛒" color="text-blue-600" />
            </div>
            <div className="metric-card">
              <MetricCard
                title="Avg Order Value"
                value={formatCurrency(metrics.avgOrderValue)}
                icon="📊"
                color="text-purple-600"
              />
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 chart-container">
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

                  {showTarget && (
                    <Line
                      yAxisId="left"
                      name="Target (5% Growth)"
                      type="monotone"
                      dataKey="target"
                      stroke={COLORS.target}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3, stroke: "white", strokeWidth: 2, fill: COLORS.target }}
                    />
                  )}

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
        </div>

        {/* Print Sales Trends Button */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 no-print">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Sales Report</h3>
              <p className="text-sm text-gray-500">Print sales trends and analytics</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Sales Report
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 no-print">
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
                  <option value="year">Year</option>
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
                  showRevenue ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setShowRevenue(!showRevenue)}
              >
                {showRevenue ? "Hide" : "Show"} Revenue
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showTarget ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setShowTarget(!showTarget)}
              >
                {showTarget ? "Hide" : "Show"} Target
              </button>
              <button
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  showUnits ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                onClick={() => setShowUnits(!showUnits)}
              >
                {showUnits ? "Hide" : "Show"} Units
              </button>
            </div>
          </div>
        </div>

        {/* Top 5 Products - Will not be printed */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 no-print">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <span className="text-xl">🏆</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Top 5 Products Sold</h3>
                <p className="text-sm text-gray-600">Most product sold</p>
              </div>
            </div>
            <div className="space-y-1">
              {topProductsByUnits.length ? (
                topProductsByUnits.map((p, idx) => (
                  <ProductRankCard key={p.id || p.name} product={p} rank={idx + 1} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📦</div>
                  <p>No product data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// HELPER UI STATES
// ============================================================================
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