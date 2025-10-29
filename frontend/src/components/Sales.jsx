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
  Clock,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import { VITE_API_BASE } from "../config";
import RefundsTicket from "./refundsTicket"; // Import with correct casing

// --- CONFIG / HELPERS ---
const API = (VITE_API_BASE || "").replace(/\/+$/, "");
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

// --- DELIVERY STATUS CONFIG ---
const deliveryStatusConfig = {
  pending: { 
    label: "Pending Assignment", 
    className: "text-gray-900", 
    bg: "bg-gray-100",
    icon: <AlertCircle className="h-3 w-3" />
  },
  assigned: { 
    label: "Assigned to Driver", 
    className: "text-green-900", 
    bg: "bg-green-100",
    icon: <Truck className="h-3 w-3" />
  },
  completed: { 
    label: "Delivered", 
    className: "text-green-900", 
    bg: "bg-green-100",
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  cancelled: { 
    label: "Cancelled", 
    className: "text-red-900", 
    bg: "bg-red-100",
    icon: <X className="h-3 w-3" />
  },
};

const getDeliveryStatusConfig = (status) => {
  const normalizedStatus = String(status ?? "pending").toLowerCase();
  return deliveryStatusConfig[normalizedStatus] || {
    label: "Unknown Status",
    className: "text-gray-700",
    bg: "bg-gray-100",
    icon: <AlertCircle className="h-3 w-3" />
  };
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

const Badge = ({ className = "", children, icon }) => (
  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
    {icon}
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

const DeliveryStatusBadge = ({ status }) => {
  const cfg = getDeliveryStatusConfig(status);
  return <Badge className={cn("font-medium", cfg.bg, cfg.className)} icon={cfg.icon}>{cfg.label}</Badge>;
};

// --- METRIC CARD ---
const MetricCard = ({ title, value, icon, color = "bg-gray-50" }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    </div>
  </div>
);

// --- ORDER CARD ---
const OrderCard = ({ order, onClick }) => {
  const items = Array.isArray(order.items) ? order.items : order.products || [];
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const idShort = String(order._id ?? order.id ?? "").slice(-8) || "unknown";
  const deliveryStatus = order.deliveryStatus || "pending";

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Order ID</p>
            <p className="font-mono text-sm font-medium truncate">#{idShort}</p>
          </div>
          <DeliveryStatusBadge status={deliveryStatus} />
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
        
        {order.delivery?.type && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Truck className="h-4 w-4" />
            <span className="capitalize">{order.delivery.type.replace("-", " ")}</span>
          </div>
        )}
        
        {order.delivery?.assignedDriver && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="h-4 w-4" />
            <span>Driver: {order.delivery.assignedDriver.name || "Assigned"}</span>
          </div>
        )}
        
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

// --- PRINTABLE RECEIPT ---
const PrintableReceipt = React.forwardRef(({ order }, ref) => {
  if (!order) return null;
  
  const items = Array.isArray(order.items) ? order.items : order.products || [];
  const subtotal = Number(
    order.subtotal ??
      items.reduce((sum, it) => sum + (Number(it.price ?? it.unitPrice ?? 0) * Number(it.quantity ?? 1)), 0)
  );
  const deliveryFee = Number(order.deliveryFee ?? order.shipping ?? 0);
  const total = Number(order.total ?? order.totalAmount ?? subtotal + deliveryFee);

  return (
    <div ref={ref} className="hidden print:block">
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { margin: 0; padding: 0; }
          .print\\:block { display: block !important; }
        }
      `}</style>
      
      <div className="max-w-[400px] mx-auto p-6 font-mono text-sm">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-2">YOUR STORE NAME</h1>
          <p className="text-xs">123 Store Address</p>
          <p className="text-xs">Contact: (123) 456-7890</p>
        </div>

        {/* Order Info */}
        <div className="mb-4 text-xs">
          <div className="flex justify-between mb-1">
            <span>Order ID:</span>
            <span className="font-bold">#{String(order._id).slice(-12)}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>Date:</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment:</span>
            <span>{order.paymentMethod ?? "N/A"}</span>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-black my-4"></div>

        {/* Items */}
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
                const name = it.name ?? it.productName ?? it.product?.name ?? "Item";
                const qty = Number(it.quantity ?? it.qty ?? 1);
                const price = Number(it.price ?? it.unitPrice ?? it.product?.price ?? 0);
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

        <div className="border-t-2 border-dashed border-black my-4"></div>

        {/* Totals */}
        <div className="space-y-2 text-xs mb-4">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{peso(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Fee:</span>
            <span>{deliveryFee === 0 ? "FREE" : peso(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t-2 border-black pt-2">
            <span>TOTAL:</span>
            <span>{peso(total)}</span>
          </div>
        </div>

        {/* Delivery Address */}
        {order.address && (
          <>
            <div className="border-t-2 border-dashed border-black my-4"></div>
            <div className="text-xs">
              <p className="font-bold mb-1">Delivery Address:</p>
              <p>{order.address}</p>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-6 pt-4 border-t-2 border-black text-xs">
          <p className="mb-1">Thank you for your order!</p>
          <p>Please come again</p>
        </div>
      </div>
    </div>
  );
});

// --- ORDER DETAILS MODAL ---
const OrderDetailsModal = ({ order, onClose }) => {
  const printRef = React.useRef(null);
  
  if (!order) return null;
  
  const items = Array.isArray(order.items) ? order.items : order.products || [];
  const subtotal = Number(
    order.subtotal ??
      items.reduce((sum, it) => sum + (Number(it.price ?? it.unitPrice ?? 0) * Number(it.quantity ?? 1)), 0)
  );
  const deliveryFee = Number(order.deliveryFee ?? order.shipping ?? 0);
  const total = Number(order.total ?? order.totalAmount ?? subtotal + deliveryFee);
  
  const deliveryStatus = order.delivery?.status || order.deliveryStatus || "pending";
  const isEPayment = order.isEPayment || false;
  
  const deliverySteps = ["pending", "assigned", "completed"];
  const currentIndex = Math.max(0, deliverySteps.indexOf(deliveryStatus));

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Hidden printable receipt */}
      <PrintableReceipt order={order} ref={printRef} />
      
      {/* Modal (hidden when printing) */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <CardHeader className="relative">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Order Details</h3>
            <p className="text-sm text-gray-500 font-mono">#{String(order._id ?? order.id ?? "").slice(-12)}</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {!isEPayment && (
              <>
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-3">
                    <Truck className="h-4 w-4" /> Delivery Status
                  </h4>
                  <div className="mb-4">
                    <DeliveryStatusBadge status={deliveryStatus} />
                  </div>

                  <div className="space-y-3">
                    {deliverySteps.map((step, idx) => {
                      const complete = idx <= currentIndex;
                      const current = idx === currentIndex;
                      const cfg = getDeliveryStatusConfig(step);
                      
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
                              {cfg.label}
                            </p>
                            {current && order.delivery?.assignedDriver && (
                              <p className="text-xs text-gray-500 mt-1">
                                Driver: {order.delivery.assignedDriver.name}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {order.delivery && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
                      {order.delivery.type && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivery Type:</span>
                          <span className="font-medium capitalize">{order.delivery.type.replace("-", " ")}</span>
                        </div>
                      )}
                      {order.delivery.scheduledDate && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Scheduled:</span>
                          <span className="font-medium">{formatDate(order.delivery.scheduledDate)}</span>
                        </div>
                      )}
                      {order.delivery.deliveredAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Delivered At:</span>
                          <span className="font-medium">{formatDate(order.delivery.deliveredAt)}</span>
                        </div>
                      )}
                      {order.delivery.assignedVehicle && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium">{order.delivery.assignedVehicle.plate || "Assigned"}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

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
                <p className="text-sm text-gray-500 mt-2">
                  {order.delivery?.deliveryAddress ?? order.address ?? order.deliveryAddress ?? "No address provided"}
                </p>
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
                  <Clock className="h-4 w-4" />
                  <span>Last updated {formatDate(order.updatedAt)}</span>
                </div>
              )}
            </div>

            {/* Print Button */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handlePrint} className="flex-1">
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Receipt
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// --- MAIN COMPONENT ---
export default function Sales() {
  const [activeTab, setActiveTab] = useState("orders"); // Tab state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const token = localStorage.getItem("pos-token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const ordersRes = await fetch(`${API}/orders`, { headers });
        if (!ordersRes.ok) {
          const text = await ordersRes.text().catch(() => "");
          throw new Error(`API ${ordersRes.status} ${ordersRes.statusText} ${text ? "- " + text : ""}`);
        }
        const ordersData = await ordersRes.json();
        const ordersList = Array.isArray(ordersData) ? ordersData : ordersData?.orders ?? ordersData?.items ?? [];

        const deliveriesRes = await fetch(`${API}/delivery`, { headers });
        let deliveriesMap = new Map();
        
        if (deliveriesRes.ok) {
          const deliveriesData = await deliveriesRes.json();
          const deliveriesList = Array.isArray(deliveriesData) ? deliveriesData : deliveriesData?.deliveries ?? [];
          
          deliveriesList.forEach(delivery => {
            const orderId = delivery.order?._id ?? delivery.order ?? delivery.orderId;
            if (orderId) {
              deliveriesMap.set(String(orderId), delivery);
            }
          });
        }

        const normalized = ordersList.map((o) => {
          const orderId = String(o._id ?? o.id ?? "unknown");
          const delivery = deliveriesMap.get(orderId);
          const paymentMethod = String(o.paymentMethod ?? o.payment ?? "").toLowerCase();
          
          const isEPayment = paymentMethod.includes("e-payment") || 
                            paymentMethod.includes("epayment") ||
                            paymentMethod.includes("electronic");
          
          const isCOD = paymentMethod.includes("cod") || 
                       paymentMethod.includes("cash");
          
          let finalDeliveryStatus;
          if (isEPayment && !isCOD) {
            finalDeliveryStatus = "completed";
          } else {
            finalDeliveryStatus = delivery?.status ?? "pending";
          }
          
          return {
            _id: orderId,
            items: Array.isArray(o.items) ? o.items : Array.isArray(o.products) ? o.products : [],
            address: o.address ?? o.deliveryAddress ?? o.shippingAddress ?? "",
            paymentMethod: o.paymentMethod ?? o.payment ?? "",
            subtotal: o.subtotal ?? o.itemsTotal ?? null,
            deliveryFee: o.deliveryFee ?? o.shipping ?? null,
            total: o.total ?? o.totalAmount ?? null,
            createdAt: o.createdAt ?? o.created ?? o.created_at ?? null,
            updatedAt: o.updatedAt ?? o.updated ?? null,
            delivery: delivery ?? null,
            deliveryStatus: finalDeliveryStatus,
            isEPayment: isEPayment && !isCOD,
            __raw: o,
          };
        });

        normalized.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        if (mounted) {
          setOrders(normalized);
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
      // Delivery status filter
      const deliveryStatus = (o.deliveryStatus ?? "pending").toLowerCase();
      const statusMatches = deliveryStatusFilter === "all" || deliveryStatus === deliveryStatusFilter;
      
      // Price filter
      const total = Number(o.total ?? 0);
      let priceMatches = true;
      if (priceFilter === "under-500") priceMatches = total < 500;
      else if (priceFilter === "500-1000") priceMatches = total >= 500 && total <= 1000;
      else if (priceFilter === "1000-2000") priceMatches = total >= 1000 && total <= 2000;
      else if (priceFilter === "over-2000") priceMatches = total > 2000;
      
      // Product filter
      const productMatches = !productFilter.trim() || 
        (o.items || []).some(item => 
          (item.name || item.title || "").toLowerCase().includes(productFilter.toLowerCase())
        );
      
      // Payment method filter
      const paymentMethod = (o.paymentMethod || "").toLowerCase();
      let paymentMatches = true;
      if (paymentMethodFilter === "e-payment") {
        paymentMatches = o.isEPayment || paymentMethod.includes("gcash") || paymentMethod.includes("paymaya") || paymentMethod.includes("card");
      } else if (paymentMethodFilter === "cod") {
        paymentMatches = paymentMethod.includes("cod") || paymentMethod.includes("cash");
      }
      
      // Search query filter
      const q = (searchQuery || "").trim().toLowerCase();
      let searchMatches = true;
      if (q) {
        const idMatch = String(o._id ?? "").toLowerCase().includes(q);
        const addrMatch = (o.address ?? "").toLowerCase().includes(q);
        searchMatches = idMatch || addrMatch;
      }
      
      return statusMatches && priceMatches && productMatches && paymentMatches && searchMatches;
    });
  }, [orders, deliveryStatusFilter, priceFilter, productFilter, paymentMethodFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, deliveryStatusFilter, priceFilter, productFilter, paymentMethodFilter]);

  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const totalOrders = orders.length;
    const delivered = orders.filter((o) => (o.deliveryStatus ?? "").toLowerCase() === "completed").length;
    const cancelled = orders.filter((o) => (o.deliveryStatus ?? "").toLowerCase() === "cancelled").length;
    const pending = orders.filter((o) => (o.deliveryStatus ?? "").toLowerCase() === "pending").length;
    return { totalRevenue, totalOrders, delivered, cancelled, pending };
  }, [orders]);

  // Render RefundsTicket component when refunds tab is active
  if (activeTab === "refunds") {
    return <RefundsTicket onBack={() => setActiveTab("orders")} />;
  }

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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold">Sales & Deliveries</h1>
            </div>
          </div>
          <p className="text-gray-500 text-lg">Track orders and delivery status in one place</p>
          
          {/* NEW: Tab Navigation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("orders")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                activeTab === "orders"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              )}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Orders
            </button>
            <button
              onClick={() => setActiveTab("refunds")}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                activeTab === "refunds"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              )}
            >
              <DollarSign className="h-4 w-4 inline mr-2" />
              Refund Tickets
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard title="Total Revenue" value={peso(metrics.totalRevenue)} icon={<CreditCard className="h-6 w-6 text-white" />} color="bg-green-500" />
          <MetricCard title="Total Orders" value={metrics.totalOrders.toLocaleString()} icon={<Package className="h-6 w-6 text-white" />} color="bg-amber-600" />
          <MetricCard title="Delivered" value={metrics.delivered.toLocaleString()} icon={<CheckCircle2 className="h-6 w-6 text-white" />} color="bg-yellow-500" />
          <MetricCard title="Cancelled" value={metrics.cancelled.toLocaleString()} icon={<X className="h-6 w-6 text-white" />} color="bg-amber-800" />
        </div>

        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by order ID or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  className="px-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={deliveryStatusFilter}
                  onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                >
                  <option value="all">All Delivery Status</option>
                  {Object.keys(deliveryStatusConfig).map((k) => (
                    <option key={k} value={k}>
                      {deliveryStatusConfig[k].label}
                    </option>
                  ))}
                </select>
              </div>
              
              <select
                className="px-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">All Price Ranges</option>
                <option value="under-500">Under ₱500</option>
                <option value="500-1000">₱500 - ₱1,000</option>
                <option value="1000-2000">₱1,000 - ₱2,000</option>
                <option value="over-2000">Over ₱2,000</option>
              </select>
              
              <Input 
                placeholder="Filter by product name..." 
                value={productFilter} 
                onChange={(e) => setProductFilter(e.target.value)} 
                className="flex-1 min-w-0"
              />
              
              <select
                className="px-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
              >
                <option value="all">All Payment Methods</option>
                <option value="e-payment">E-Payment</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No orders found</h2>
            <p className="text-gray-500">
              {searchQuery || deliveryStatusFilter !== "all" || priceFilter !== "all" || productFilter.trim() || paymentMethodFilter !== "all"
                ? "Try adjusting your filters" 
                : "Your order history will appear here once you make a purchase"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedOrders.map((order) => (
                <OrderCard key={String(order._id ?? Math.random())} order={order} onClick={() => setSelectedOrder(order)} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white rounded-xl border p-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                  <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
                  <span className="font-medium text-gray-900">{filtered.length}</span> orders
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      const showPage = 
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                      
                      const showEllipsis =
                        (pageNum === currentPage - 2 && currentPage > 3) ||
                        (pageNum === currentPage + 2 && currentPage < totalPages - 2);

                      if (showEllipsis) {
                        return <span key={pageNum} className="px-2 text-gray-500">...</span>;
                      }

                      if (!showPage) return null;

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="default"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2.5rem]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

    </div>
  );
}