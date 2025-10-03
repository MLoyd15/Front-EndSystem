// src/pages/Sales.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  MapPin,
  CreditCard,
  Calendar,
  Filter,
  Search,
  X,
  Truck,
  CheckCircle2,
} from "lucide-react";
import { VITE_API_BASE } from "../config";

// --- CONFIG / HELPERS ---
const API = (VITE_API_BASE || "").replace(/\/+$/, ""); // strip trailing slash if any
const cn = (...c) => c.filter(Boolean).join(" ");

const peso = (n) =>
  `₱${Number(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

// --- STATUS CONFIG + SAFE ACCESSOR ---
const statusConfig = {
  pending: { label: "Pending", className: "text-orange-900", bg: "bg-orange-100" },
  confirmed: { label: "Confirmed", className: "text-blue-900", bg: "bg-blue-100" },
  preparing: { label: "Preparing", className: "text-purple-900", bg: "bg-purple-100" },
  "out-for-delivery": { label: "Out for Delivery", className: "text-indigo-900", bg: "bg-indigo-100" },
  delivered: { label: "Delivered", className: "text-green-900", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", className: "text-red-900", bg: "bg-red-100" },
};

const getStatusConfig = (status) =>
  statusConfig[status] || {
    label:
      (status && String(status).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())) ||
      "Unknown",
    className: "text-gray-700",
    bg: "bg-gray-100",
  };

// --- SMALL UI COMPONENTS ---
const Card = ({ className = "", children, onClick }) => (
  <div className={cn("rounded-lg border bg-white shadow-sm", className)} onClick={onClick}>
    {children}
  </div>
);

const CardHeader = ({ className = "", children }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);

const CardContent = ({ className = "", children }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
);

const Badge = ({ className = "", children }) => (
  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
    {children}
  </span>
);

const Input = ({ className = "", ...props }) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
);

const Button = ({ className = "", variant = "default", size = "default", children, ...props }) => {
  const baseClass =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-gray-100 text-gray-700",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    icon: "h-10 w-10",
  };

  return (
    <button className={cn(baseClass, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

const Separator = ({ className = "" }) => <div className={cn("h-px bg-gray-200", className)} />;

const OrderStatusBadge = ({ status }) => {
  const cfg = getStatusConfig(status);
  return <Badge className={cn("font-medium", cfg.bg, cfg.className)}>{cfg.label}</Badge>;
};

// --- METRIC CARD ---
const MetricCard = ({ title, value, icon }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="p-3 rounded-lg bg-gray-50">{icon}</div>
    </div>
  </div>
);

// --- ORDER CARD / DETAILS ---
const OrderCard = ({ order, onClick }) => {
  // normalize to avoid crashes
  const items = Array.isArray(order.items) ? order.items : order.products || [];
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const idShort = String(order._id ?? order.id ?? "").slice(-8) || "unknown";

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono text-sm font-medium truncate">#{idShort}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
          <span className="ml-auto font-semibold text-lg">{peso(total)}</span>
        </div>
        {order.address && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{order.address}</span>
          </div>
        )}
        {(order.paymentMethod || order.payment) && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="h-4 w-4" />
            <span>{order.paymentMethod ?? order.payment ?? "—"}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(order.createdAt ?? order.created)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;
  const items = Array.isArray(order.items) ? order.items : order.products || [];
  const subtotal = Number(
    order.subtotal ??
      items.reduce((sum, it) => sum + (Number(it.price ?? it.unitPrice ?? 0) * Number(it.quantity ?? 1)), 0)
  );
  const deliveryFee = Number(order.deliveryFee ?? order.shipping ?? 0);
  const total = Number(order.total ?? order.totalAmount ?? subtotal + deliveryFee);
  const currentStatus = String(order.status ?? "").toLowerCase();

  const statusSteps = ["pending", "confirmed", "preparing", "out-for-delivery", "delivered"];
  const currentIndex = Math.max(0, statusSteps.indexOf(currentStatus));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Order Details</h3>
          <p className="text-sm text-gray-500 font-mono">#{String(order._id ?? order.id ?? "").slice(-12)}</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" /> Order Status
            </h4>
            <div className="mt-3">
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-4 space-y-3">
              {statusSteps.map((step, idx) => {
                const complete = idx <= currentIndex;
                const current = idx === currentIndex;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        complete ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
                      )}
                    >
                      {complete ? "✓" : idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", current && "text-blue-600")}>
                        {step.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold">Items Ordered</h4>
            <div className="space-y-2 mt-3">
              {items.map((it, i) => {
                const name = it.name ?? it.productName ?? it.product?.name ?? "Unnamed item";
                const qty = Number(it.quantity ?? it.qty ?? 1);
                const price = Number(it.price ?? it.unitPrice ?? it.product?.price ?? 0);
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-gray-500">Qty: {qty}</p>
                    </div>
                    <p className="font-semibold">{peso(price * qty)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Delivery Address
              </h4>
              <p className="text-sm text-gray-500 mt-2">{order.address ?? order.deliveryAddress ?? "No address provided"}</p>
              {order.deliveryType && (
                <div className="flex items-center gap-2 mt-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm capitalize">{String(order.deliveryType).replace("-", " ")}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payment
              </h4>
              <p className="text-sm text-gray-500 mt-2">{order.paymentMethod ?? order.payment ?? "Not specified"}</p>

              <div className="mt-4 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{peso(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span>{deliveryFee === 0 ? "FREE" : peso(deliveryFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">{peso(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Ordered on {formatDate(order.createdAt ?? order.created)}</span>
            </div>
            {order.updatedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Last updated {formatDate(order.updatedAt)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- MAIN PAGE ---
export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("pos-token");
        if (token) headers.Authorization = `Bearer ${token}`;

        // Expect backend to expose an /orders endpoint
        const res = await fetch(`${API}/orders`, { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`API ${res.status} ${res.statusText} ${text ? "- " + text : ""}`);
        }
        const data = await res.json();

        // normalize to array
        const list = Array.isArray(data) ? data : data?.orders ?? data?.items ?? [];
        // safety map: ensure minimal fields exist
        const normalized = list.map((o) => ({
          _id: o._id ?? o.id ?? "unknown",
          status: (o.status ?? "pending")?.toString().toLowerCase(),
          items: Array.isArray(o.items) ? o.items : Array.isArray(o.products) ? o.products : [],
          address: o.address ?? o.deliveryAddress ?? o.shippingAddress ?? "",
          paymentMethod: o.paymentMethod ?? o.payment ?? "",
          subtotal: o.subtotal ?? o.itemsTotal ?? null,
          deliveryFee: o.deliveryFee ?? o.shipping ?? null,
          total: o.total ?? o.totalAmount ?? null,
          createdAt: o.createdAt ?? o.created ?? o.created_at ?? null,
          updatedAt: o.updatedAt ?? o.updated ?? null,
          // keep original for debugging
          __raw: o,
        }));

        if (mounted) {
          setOrders(normalized);
          // log unexpected shapes to console for easy debugging
          const bad = normalized.filter((x) => !x._id || !x.status);
          if (bad.length > 0) console.warn("Sales page: found orders with missing _id/status:", bad.map((b) => b.__raw));
        }
      } catch (e) {
        console.error("Order fetch error:", e);
        if (mounted) setErrorMsg(e instanceof Error ? e.message : String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const statusMatches = statusFilter === "all" || (o.status ?? "pending") === statusFilter;
      const q = (searchQuery || "").trim().toLowerCase();
      if (!q) return statusMatches;
      const idMatch = String(o._id ?? "").toLowerCase().includes(q);
      const addrMatch = (o.address ?? "").toLowerCase().includes(q);
      return statusMatches && (idMatch || addrMatch);
    });
  }, [orders, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalOrders = orders.length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => o.status === "pending").length;
    return { totalRevenue, totalOrders, delivered, pending };
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load orders</h3>
            <p className="text-gray-500 mb-4">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold">Sales & Orders</h1>
          </div>
          <p className="text-gray-500 text-lg">Track and manage all your orders in one place</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total Revenue" value={peso(metrics.totalRevenue)} icon={<CreditCard className="h-6 w-6" />} />
          <MetricCard title="Total Orders" value={metrics.totalOrders.toLocaleString()} icon={<Package className="h-6 w-6" />} />
          <MetricCard title="Delivered" value={metrics.delivered.toLocaleString()} icon={<CheckCircle2 className="h-6 w-6" />} />
          <MetricCard title="Pending" value={metrics.pending.toLocaleString()} icon={<Calendar className="h-6 w-6" />} />
        </div>

        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by order ID or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                className="px-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                {Object.keys(statusConfig).map((k) => (
                  <option key={k} value={k}>
                    {statusConfig[k].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No orders found</h2>
            <p className="text-gray-500">{searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Your order history will appear here once you make a purchase"}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((order) => (
              <OrderCard key={String(order._id ?? Math.random())} order={order} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}

        {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </div>
    </div>
  );
}
