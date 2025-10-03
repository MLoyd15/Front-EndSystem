import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Filter,
  Search,
  X,
  XCircle,
  Eye,
  Package,
  User,
  Calendar,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

import { VITE_API_BASE } from "../config";

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

// --- STATUS CONFIG ---
const statusConfig = {
  requested: {
    label: "Requested",
    className: "text-yellow-900",
    bg: "bg-yellow-100",
    icon: <Clock className="h-3 w-3" />
  },
  under_review: {
    label: "Under Review",
    className: "text-blue-900",
    bg: "bg-blue-100",
    icon: <Eye className="h-3 w-3" />
  },
  approved: {
    label: "Approved",
    className: "text-green-900",
    bg: "bg-green-100",
    icon: <CheckCircle2 className="h-3 w-3" />
  },
  rejected: {
    label: "Rejected",
    className: "text-red-900",
    bg: "bg-red-100",
    icon: <XCircle className="h-3 w-3" />
  },
  refunded: {
    label: "Refunded",
    className: "text-emerald-900",
    bg: "bg-emerald-100",
    icon: <DollarSign className="h-3 w-3" />
  },
  closed: {
    label: "Closed",
    className: "text-gray-900",
    bg: "bg-gray-100",
    icon: <X className="h-3 w-3" />
  }
};

const getStatusConfig = (status) => {
  const normalizedStatus = String(status ?? "requested").toLowerCase();
  return statusConfig[normalizedStatus] || statusConfig.requested;
};

// --- UI COMPONENTS ---
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

const Textarea = ({ className = "", ...props }) => (
  <textarea
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
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
    destructive: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    icon: "h-10 w-10",
  };

  return (
    <button className={cn(baseClass, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

const Separator = ({ className = "" }) => <div className={cn("h-px bg-gray-200", className)} />;

const StatusBadge = ({ status }) => {
  const cfg = getStatusConfig(status);
  return <Badge className={cn("font-medium", cfg.bg, cfg.className)} icon={cfg.icon}>{cfg.label}</Badge>;
};

// --- METRIC CARD ---
const MetricCard = ({ title, value, icon, color = "gray" }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className={`p-3 rounded-lg bg-${color}-50`}>{icon}</div>
    </div>
  </div>
);

// --- TICKET CARD ---
const TicketCard = ({ ticket, onClick }) => {
  const amount = Number(ticket.amount ?? 0) / 100; // Convert centavos to pesos
  const idShort = String(ticket._id ?? "").slice(-8) || "unknown";
  const userName = ticket.user?.name || ticket.user?.email || "Unknown User";
  const orderIdShort = String(ticket.order?._id ?? ticket.order ?? "").slice(-8) || "N/A";

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">Ticket ID</p>
            <p className="font-mono text-sm font-medium truncate">#{idShort}</p>
          </div>
          <StatusBadge status={ticket.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Refund Amount</span>
          <span className="font-semibold text-lg text-blue-600">{peso(amount)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <User className="h-4 w-4" />
          <span className="truncate">{userName}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="h-4 w-4" />
          <span>Order: #{orderIdShort}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <CreditCard className="h-4 w-4" />
          <span className="truncate font-mono text-xs">{ticket.paymentId}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(ticket.createdAt)}</span>
        </div>

        {ticket.reason && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500">Reason:</p>
            <p className="text-sm text-gray-700 line-clamp-2">{ticket.reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- TICKET DETAILS MODAL ---
const TicketDetailsModal = ({ ticket, onClose, onUpdate }) => {
  const [status, setStatus] = useState(ticket?.status || "requested");
  const [adminNote, setAdminNote] = useState(ticket?.adminNote || "");
  const [paymongoRefundId, setPaymongoRefundId] = useState(ticket?.paymongoRefundId || "");
  const [saving, setSaving] = useState(false);

  if (!ticket) return null;

  const amount = Number(ticket.amount ?? 0) / 100;
  const orderIdFull = String(ticket.order?._id ?? ticket.order ?? "unknown");
  const userName = ticket.user?.name || ticket.user?.email || "Unknown User";
  const processedByName = ticket.processedBy?.name || ticket.processedBy?.email || "—";

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("pos-token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${API}/admin/refund-tickets/${ticket._id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status, adminNote, paymongoRefundId })
      });

      if (!res.ok) throw new Error("Failed to update ticket");
      
      const data = await res.json();
      if (data.ok) {
        onUpdate(data.ticket);
        onClose();
      }
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update ticket: " + err.message);
    } finally {
      setSaving(false);
    }
  };

 return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="relative">
        <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <h3 className="text-2xl font-semibold leading-none tracking-tight">Refund Ticket Details</h3>
        <p className="text-sm text-gray-500 font-mono">#{String(ticket._id).slice(-12)}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status & Amount */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Current Status</h4>
            <StatusBadge status={ticket.status} />
          </div>
          <div>
            <h4 className="font-semibold mb-2">Refund Amount</h4>
            <p className="text-2xl font-bold text-blue-600">{peso(amount)}</p>
            <p className="text-xs text-gray-500 mt-1">Currency: {ticket.currency || "PHP"}</p>
          </div>
        </div>

          <Separator />

          {/* Customer Info */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <User className="h-4 w-4" /> Customer Information
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{userName}</span>
              </div>
              {ticket.user?.email && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{ticket.user.email}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Order Info */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" /> Related Order
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono font-medium">#{orderIdFull.slice(-12)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono font-medium text-xs">{ticket.paymentId}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4" /> Refund Reason
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.reason}</p>
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4" /> Attachments
                </h4>
                <div className="space-y-2">
                  {ticket.attachments.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Admin Actions */}
          <div className="space-y-4">
            <h4 className="font-semibold">Admin Actions</h4>
            
            <div>
              <label className="block text-sm font-medium mb-2">Update Status</label>
              <select
                className="w-full px-4 py-2 rounded-lg border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {Object.keys(statusConfig).map((k) => (
                  <option key={k} value={k}>
                    {statusConfig[k].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Admin Note</label>
              <Textarea
                placeholder="Add internal notes about this ticket..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">PayMongo Refund ID (Optional)</label>
              <Input
                placeholder="refund_xxx"
                value={paymongoRefundId}
                onChange={(e) => setPaymongoRefundId(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* Processing Info */}
          <div className="text-sm text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Created: {formatDate(ticket.createdAt)}</span>
            </div>
            {ticket.updatedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Last updated: {formatDate(ticket.updatedAt)}</span>
              </div>
            )}
            {ticket.processedBy && (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                <span>Processed by: {processedByName}</span>
              </div>
            )}
            {ticket.processedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                <span>Processed at: {formatDate(ticket.processedAt)}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function RefundTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchTickets = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("pos-token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("limit", "500"); // Fetch more for client-side pagination

      const res = await fetch(`${API}/admin/refund-tickets?${params}`, { headers });
      if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);

      const data = await res.json();
      const ticketsList = Array.isArray(data) ? data : data?.tickets ?? [];
      setTickets(ticketsList);
    } catch (err) {
      console.error("Fetch error:", err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      
      const idMatch = String(t._id ?? "").toLowerCase().includes(q);
      const reasonMatch = (t.reason ?? "").toLowerCase().includes(q);
      const paymentMatch = (t.paymentId ?? "").toLowerCase().includes(q);
      const userMatch = (t.user?.name ?? t.user?.email ?? "").toLowerCase().includes(q);
      
      return idMatch || reasonMatch || paymentMatch || userMatch;
    });
  }, [tickets, searchQuery]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    const totalAmount = tickets.reduce((s, t) => s + (Number(t.amount ?? 0) / 100), 0);
    const totalTickets = tickets.length;
    const pending = tickets.filter((t) => t.status === "requested").length;
    const approved = tickets.filter((t) => t.status === "approved" || t.status === "refunded").length;
    const rejected = tickets.filter((t) => t.status === "rejected").length;
    
    return { totalAmount, totalTickets, pending, approved, rejected };
  }, [tickets]);

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prev => prev.map(t => t._id === updatedTicket._id ? updatedTicket : t));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl border p-4 h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="container mx-auto max-w-7xl">
          <div className="bg-white rounded-xl border border-red-200 p-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load refund tickets</h3>
            <p className="text-gray-500 mb-4">{errorMsg}</p>
            <Button onClick={fetchTickets}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold">Refund Tickets</h1>
          </div>
          <p className="text-gray-500 text-lg">Manage and process customer refund requests</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Total Refund Amount"
            value={peso(metrics.totalAmount)}
            icon={<DollarSign className="h-6 w-6" />}
            color="blue"
          />
          <MetricCard
            title="Total Tickets"
            value={metrics.totalTickets.toLocaleString()}
            icon={<FileText className="h-6 w-6" />}
            color="gray"
          />
          <MetricCard
            title="Pending"
            value={metrics.pending.toLocaleString()}
            icon={<Clock className="h-6 w-6" />}
            color="yellow"
          />
          <MetricCard
            title="Approved/Refunded"
            value={metrics.approved.toLocaleString()}
            icon={<CheckCircle2 className="h-6 w-6" />}
            color="green"
          />
          <MetricCard
            title="Rejected"
            value={metrics.rejected.toLocaleString()}
            icon={<XCircle className="h-6 w-6" />}
            color="red"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by ticket ID, reason, payment ID, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
            <Button onClick={fetchTickets} variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tickets Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border">
            <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No tickets found</h2>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Refund tickets will appear here when customers request refunds"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedTickets.map((ticket) => (
                <TicketCard
                  key={String(ticket._id)}
                  ticket={ticket}
                  onClick={() => setSelectedTicket(ticket)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between bg-white rounded-xl border p-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                  <span className="font-medium text-gray-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of{" "}
                  <span className="font-medium text-gray-900">{filtered.length}</span> tickets
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "ghost"}
                          size="default"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[2.5rem]" >
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
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
          
        )}
      </div>
      

      {/* Modal */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdate={handleTicketUpdate}
        />
      )}
    </div>
  );
}