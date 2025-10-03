import { useState, useEffect, useMemo } from "react";
import { Package, MapPin, CreditCard, Calendar, Filter, Search, X, Truck, CheckCircle2 } from "lucide-react";
import { VITE_API_BASE } from "../config";

const API = VITE_API_BASE;

const cn = (...classes) => classes.filter(Boolean).join(" ");

const Card = ({ className = "", children, onClick }) => (
  <div className={cn("rounded-lg border bg-white shadow-sm", className)} onClick={onClick}>
    {children}
  </div>
);

const CardHeader = ({ className = "", children }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
);

const CardTitle = ({ className = "", children }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h3>
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
  const baseClass = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "hover:bg-gray-100 text-gray-700"
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    icon: "h-10 w-10"
  };
  
  return (
    <button className={cn(baseClass, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

const Separator = ({ className = "" }) => (
  <div className={cn("h-px bg-gray-200", className)} />
);

const statusConfig = {
  pending: { label: "Pending", className: "text-orange-900", bg: "bg-orange-100" },
  confirmed: { label: "Confirmed", className: "text-blue-900", bg: "bg-blue-100" },
  preparing: { label: "Preparing", className: "text-purple-900", bg: "bg-purple-100" },
  "out-for-delivery": { label: "Out for Delivery", className: "text-indigo-900", bg: "bg-indigo-100" },
  delivered: { label: "Delivered", className: "text-green-900", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", className: "text-red-900", bg: "bg-red-100" }
};

const statusSteps = ["pending", "confirmed", "preparing", "out-for-delivery", "delivered"];

const peso = (n) => `₱${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${month} ${day}, ${year} at ${hour12}:${minuteStr} ${ampm}`;
};

const OrderStatusBadge = ({ status }) => {
  const config = statusConfig[status];
  return <Badge className={cn("font-medium", config.bg, config.className)}>{config.label}</Badge>;
};

const MetricCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className={cn("text-2xl font-bold", color)}>{value}</p>
      </div>
      <div className={cn("p-3 rounded-lg", color.replace("text-", "bg-").replace("600", "100"))}>
        {icon}
      </div>
    </div>
  </div>
);

const OrderCard = ({ order, onClick }) => {
  const items = order.items || [];
  const total = Number(order.total || 0);

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono text-sm font-medium truncate">#{order._id.slice(-8)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""}</span>
          <span className="ml-auto font-semibold text-lg">{peso(total)}</span>
        </div>
        {order.address && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{order.address}</span>
          </div>
        )}
        {order.paymentMethod && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CreditCard className="h-4 w-4" />
            <span>{order.paymentMethod}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(order.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const OrderDetails = ({ order, onClose }) => {
  const items = order.items || [];
  const total = Number(order.total || 0);
  const subtotal = Number(order.subtotal || items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0));
  const deliveryFee = Number(order.deliveryFee || 0);
  const currentStepIndex = statusSteps.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <CardTitle>Order Details</CardTitle>
          <p className="text-sm text-gray-500 font-mono">#{order._id}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Status
            </h3>
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status} />
            </div>
            {!isCancelled && (
              <div className="mt-4 space-y-3">
                {statusSteps.map((step, index) => {
                  const isComplete = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2",
                        isComplete ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
                      )}>
                        {isComplete ? "✓" : index + 1}
                      </div>
                      <div className="flex-1">
                        <p className={cn("text-sm font-medium", isCurrent && "text-blue-600")}>
                          {step.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isCancelled && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600 font-medium">This order has been cancelled</p>
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold">Items Ordered</h3>
            <div className="space-y-2">
              {items.map((item, index) => {
                const name = item.name || "Unknown Item";
                const quantity = Number(item.quantity || 1);
                const price = Number(item.price || 0);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-gray-500">Quantity: {quantity}</p>
                    </div>
                    <p className="font-semibold">{peso(price * quantity)}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
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
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address
              </h3>
              <p className="text-sm text-gray-500">{order.address || "No address provided"}</p>
              {order.deliveryType && (
                <div className="flex items-center gap-2 mt-2">
                  <Truck className="h-4 w-4 text-gray-500" />
                  <span className="text-sm capitalize">{order.deliveryType.replace("-", " ")}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </h3>
              <p className="text-sm text-gray-500">{order.paymentMethod || "Not specified"}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>Ordered on {formatDate(order.createdAt)}</span>
            </div>
            {order.updatedAt && (
              <div className="flex items-center gap-2 text-gray-500">
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

export default function Sales() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = { "Content-Type": "application/json" };
        const token = localStorage.getItem("pos-token");
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${API}/orders`, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        const ordersList = Array.isArray(data) ? data : (data?.orders || []);
        setOrders(ordersList);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load orders";
        setError(message);
        console.error("Order fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesSearch = searchQuery === "" || 
        order._id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        order.address?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === "delivered").length;
    const pendingOrders = orders.filter(o => o.status === "pending").length;
    return { totalRevenue, totalOrders, deliveredOrders, pendingOrders };
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load orders</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
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
          <MetricCard title="Total Revenue" value={peso(metrics.totalRevenue)} icon={<CreditCard className="h-6 w-6" />} color="text-blue-600" />
          <MetricCard title="Total Orders" value={metrics.totalOrders.toLocaleString()} icon={<Package className="h-6 w-6" />} color="text-blue-600" />
          <MetricCard title="Delivered" value={metrics.deliveredOrders.toLocaleString()} icon={<CheckCircle2 className="h-6 w-6" />} color="text-green-600" />
          <MetricCard title="Pending" value={metrics.pendingOrders.toLocaleString()} icon={<Calendar className="h-6 w-6" />} color="text-orange-600" />
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
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="out-for-delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No orders found</h2>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "Your order history will appear here once you make a purchase"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} onClick={() => setSelectedOrder(order)} />
            ))}
          </div>
        )}
        {selectedOrder && <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </div>
    </div>
  );
}