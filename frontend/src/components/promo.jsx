import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Search,
  Filter,
  Archive,
  Percent,
  Copy,
  Trash2,
  Play,
  Pause,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { VITE_API_BASE } from "../config"

/* ---------------- CONFIG ---------------- */
const API = `${VITE_API_BASE}/promo`;
const auth = () => ({ 
  Authorization: `Bearer ${localStorage.getItem("pos-token") || ""}`,
  "Content-Type": "application/json"
});

/* ---------------- Helpers ---------------- */
const peso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

const computeDisplayStatus = (p) => {
  const now = new Date();
  const start = p.startsAt ? new Date(p.startsAt) : null;
  const end = p.endsAt ? new Date(p.endsAt) : null;
  if (p.status === "Paused") return "Paused";
  if (end && now > end) return "Expired";
  if (p.status === "Active" && start && now < start) return "Scheduled";
  return "Active";
};

const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

/* ---------------- Field + KPI ---------------- */
const Field = ({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  min,
  max,
  step,
  error = false,
}) => (
  <input
    name={name}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    min={min}
    max={max}
    step={step}
    className={`w-full rounded-lg border ${error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-50 disabled:text-gray-500`}
  />
);

const KpiCard = ({ label, value, color, icon }) => {
  const colorClasses = {
    gray: "bg-gray-600",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    amber: "bg-amber-600",
    brown: "bg-amber-700",
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]} text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Component ---------------- */
const Promo = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Percentage",
    value: "",
    minSpend: "",
    maxDiscount: "",
    limit: "",
    status: "Active",
    startsAt: "",
    endsAt: "",
  });
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const showModal = (title, message, type = "info") => {
    setModal({ isOpen: true, title, message, type });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Validation errors
  const maxDiscountError = form.maxDiscount && Number(form.maxDiscount) > 0 && (Number(form.maxDiscount) < 50 || Number(form.maxDiscount) > 1000);
  const valueError = form.type === "Percentage" ? (form.value && (Number(form.value) < 1 || Number(form.value) > 99)) : form.type === "Fixed Amount" ? (form.value && (Number(form.value) < 0 || Number(form.value) > 10000)) : false;
  const minSpendError = form.minSpend && Number(form.minSpend) < 50;
  const limitError = form.limit && Number(form.limit) > 10000;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsPromo, setDetailsPromo] = useState(null);

  const openDetails = (promo) => {
    setDetailsPromo(promo);
    setDetailsOpen(true);
  };
  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsPromo(null);
  };

  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [savingReactivate, setSavingReactivate] = useState(false);
  const [sched, setSched] = useState({ startsAt: "", endsAt: "" });

  /* --------- API calls --------- */
  const load = async () => {
    setLoading(true);
    try {
      console.log("🔍 Fetching promos from:", `${API}?q=${encodeURIComponent(q)}`);
      const res = await axios.get(`${API}?q=${encodeURIComponent(q)}`, { headers: auth() });
      console.log("✅ Promos response:", res.data);
      setPromos(Array.isArray(res.data) ? res.data : res.data.promos || []);
    } catch (e) {
      console.error("❌ Load promos failed:", e);
      console.error("❌ Error response:", e.response?.data);
      setPromos([]);
      if (e.response?.status === 401) {
        showModal("Session Expired", "Please login again.", "error");
        localStorage.removeItem("pos-token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { 
    load(); 
  }, [q]);

  const createPromo = async () => {
  const val = Number(form.value || 0);
  const minSpend = Number(form.minSpend || 0);
  const maxDiscount = Number(form.maxDiscount || 0);
  const limit = Number(form.limit || 0);

  // Validation
  if (!form.code.trim()) return showModal("Validation Error", "Promo code is required", "error")
  if (!form.name.trim()) return showModal("Validation Error", "Internal label is required", "error")
  
  if (form.type === "Percentage") {
    if (val < 1) return showModal("Validation Error", "Percentage must be at least 1%", "error");
    if (val > 99) return showModal("Validation Error", "Percentage cannot exceed 99%", "error");
  }
  if (form.type === "Fixed Amount") {
    if (val < 0) return showModal("Validation Error", "Amount cannot be negative", "error");
    if (val > 10000) return showModal("Validation Error", "Fixed amount cannot exceed ₱10,000", "error");
  }
  if (limit !== 0 && limit > 10000) return showModal("Validation Error", "Usage limit cannot exceed 10,000 or set 0 for unlimited", "error");
  if (minSpend < 50) return showModal("Validation Error", "Minimum spend must be at least ₱50", "error");
  if (maxDiscount !== 0 && (maxDiscount < 50 || maxDiscount > 1000)) return showModal("Validation Error", "Max discount must be ₱50-1,000 or 0 for no cap", "error");

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of today

  // Check if start date is provided and validate
  if (form.startsAt) {
    const startDate = new Date(form.startsAt + 'T00:00:00'); // Force time to midnight
    
    if (startDate < today) {
      return showModal("Validation Error", "Start date cannot be in the past", "error");
    }
  }

  // Check if end date is provided and validate
  if (form.endsAt) {
    const endDate = new Date(form.endsAt + 'T00:00:00'); // Force time to midnight
    
    // End date cannot be in the past (this prevents expired promos)
    if (endDate < today) {
      return showModal("Validation Error", "End date cannot be in the past. This promo would be expired immediately.", "error");
    }

    // If both dates provided, end must be after start
    if (form.startsAt) {
      const startDate = new Date(form.startsAt + 'T00:00:00');
      
      if (endDate <= startDate) {
        return showModal("Validation Error", "End date must be after start date", "error");
      }
    }
  }

  try {
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      value: form.type === "Free Shipping" ? 0 : val,
      minSpend,
      maxDiscount,
      limit,
    };
    console.log("📤 Creating promo:", payload);
    
    const response = await axios.post(API, payload, { headers: auth() });
    console.log("✅ Create response:", response.data);
    
    showModal("Success", "Promo created successfully!", "success")
    setForm({
      code: "",
      name: "",
      type: "Percentage",
      value: "",
      minSpend: "",
      maxDiscount: "",
      limit: "",
      status: "Active",
      startsAt: "",
      endsAt: "",
    });
    load();
  } catch (e) {
    console.error("❌ Error creating promo:", e.response?.data || e);
    showModal("Error", e?.response?.data?.message || "Error creating promo", "error");
  }
};

  const duplicate = async (id) => {
    try {
      console.log("📋 Duplicating promo:", id);
      const response = await axios.post(`${API}/${id}/duplicate`, {}, { headers: auth() });
      console.log("✅ Duplicate response:", response.data);
      showModal("Success", "Promo duplicated successfully!", "success");
      load();
    } catch (e) {
      console.error("❌ Error duplicating promo:", e.response?.data || e);
      showModal("Error", e?.response?.data?.message || "Error duplicating promo", "error");
    }
  };

  const togglePause = async (p) => {
    try {
      const status = computeDisplayStatus(p);
      const body = status === "Scheduled" ? { forceActivate: true } : {};
      console.log("⏯️ Toggling promo:", p._id, body);
      
      const response = await axios.patch(`${API}/${p._id}/toggle`, body, { headers: auth() });
      console.log("✅ Toggle response:", response.data);
      load();
    } catch (e) {
      console.error("❌ Error updating status:", e.response?.data || e);
      showModal("Error", e?.response?.data?.message || "Error updating status", "error");
    }
  };

  const archive = async (id) => {
    try {
      console.log("📦 Archiving promo:", id);
      const response = await axios.patch(`${API}/${id}/archive`, {}, { headers: auth() });
      console.log("✅ Archive response:", response.data);
      load();
    } catch (e) {
      console.error("❌ Error archiving promo:", e.response?.data || e);
      showModal("Error", e?.response?.data?.message || "Error archiving promo", "error");
    }
  };

  const unarchive = async (id) => {
    try {
      console.log("📤 Unarchiving promo:", id);
      const response = await axios.patch(`${API}/${id}/unarchive`, {}, { headers: auth() });
      console.log("✅ Unarchive response:", response.data);
      load();
    } catch (e) {
      console.error("❌ Error unarchiving promo:", e.response?.data || e);
      showModal("Error", e?.response?.data?.message || "Error unarchiving promo", "error");
    }
  };

  const remove = async (id) => {
    showConfirm(
      "Delete Promo?",
      "Are you sure you want to permanently delete this promo? This action cannot be undone.",
      async () => {
        try {
          console.log("🗑️ Deleting promo:", id);
          const response = await axios.delete(`${API}/${id}`, { headers: auth() });
          console.log("✅ Delete response:", response.data);
          load();
        } catch (e) {
          console.error("❌ Error deleting promo:", e.response?.data || e);
          showModal("Error", e?.response?.data?.message || "Error deleting promo", "error");
        }
      }
    );
  };

  const openReactivate = (p) => {
    setReactivateTarget(p);
    setSched({ startsAt: "", endsAt: "" });
    setReactivateOpen(true);
  };

  const saveReactivate = async () => {
    if (!reactivateTarget) return;
    setSavingReactivate(true);
    try {
      const response = await axios.patch(
        `${API}/${reactivateTarget._id}/reactivate`,
        sched,
        { headers: auth() }
      );
      console.log("✅ Reactivate response:", response.data);
      showModal("Success", "Promo reactivated successfully!", "success");
      load();
      setReactivateOpen(false);
      setReactivateTarget(null);
      setSched({ startsAt: "", endsAt: "" });
    } catch (e) {
      console.error("❌ Error reactivating promo:", e.response?.data || e);
      showModal("Error", e?.response?.data?.message || "Error reactivating promo", "error");
    } finally {
      setSavingReactivate(false);
    }
  };

  /* --------- Computed data --------- */
  const enrichedPromos = useMemo(() => {
    return promos.map((p) => ({ ...p, _displayStatus: computeDisplayStatus(p) }));
  }, [promos]);

  const filtered = useMemo(() => {
    let data = enrichedPromos.filter((p) =>
      showArchived ? p.archived : !p.archived
    );
    if (type) data = data.filter((p) => p.type === type);
    if (statusFilter) data = data.filter((p) => p._displayStatus === statusFilter);
    return data;
  }, [enrichedPromos, showArchived, type, statusFilter]);

  const total = filtered.length;
  const active = filtered.filter((p) => p._displayStatus === "Active").length;
  const scheduled = filtered.filter((p) => p._displayStatus === "Scheduled").length;
  const paused = filtered.filter((p) => p._displayStatus === "Paused").length;
  const expired = filtered.filter((p) => p._displayStatus === "Expired").length;

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const statusPill = (status) => {
    const styles = {
      Active: "bg-green-100 text-green-700 ring-1 ring-green-600/20",
      Scheduled: "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-600/20",
      Paused: "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20",
      Expired: "bg-red-100 text-red-700 ring-1 ring-red-600/20",
    };
    const icons = {
      Active: <CheckCircle2 className="w-3 h-3" />,
      Scheduled: <Clock className="w-3 h-3" />,
      Paused: <Pause className="w-3 h-3" />,
      Expired: <XCircle className="w-3 h-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || ""}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const canToggle = (status) => status === "Active" || status === "Paused" || status === "Scheduled";
  const getToggleButton = (p) => {
    const s = p._displayStatus;
    if (s === "Active") return { text: "Pause", icon: <Pause className="h-3.5 w-3.5" />, action: () => togglePause(p) };
    if (s === "Paused" || s === "Scheduled") return { text: "Activate", icon: <Play className="h-3.5 w-3.5" />, action: () => togglePause(p) };
    return null;
  };

  /* ---------------- Modal Components ---------------- */
  const Modal = ({ isOpen, onClose, title, message, type = "info" }) => {
    if (!isOpen) return null;

    const getIcon = () => {
      switch (type) {
        case "success": return "✓";
        case "error": return "✕";
        case "warning": return "⚠";
        default: return "ℹ";
      }
    };

    const getColors = () => {
      switch (type) {
        case "success": return "bg-green-100 text-green-700 ring-green-200";
        case "error": return "bg-red-100 text-red-700 ring-red-200";
        case "warning": return "bg-amber-100 text-amber-700 ring-amber-200";
        default: return "bg-blue-100 text-blue-700 ring-blue-200";
      }
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full ${getColors()} ring-2 flex items-center justify-center flex-shrink-0 text-xl font-bold`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 ring-2 ring-red-200 flex items-center justify-center flex-shrink-0 text-xl font-bold">
              ⚠
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium ring-1 ring-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      
      <div className="min-h-screen bg-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-green-600 mb-2">
                  Product Promo & Discounts
                </h1>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Configure discounts, limits, and schedules for your promotions
                </p>
              </div>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="bg-white hover:bg-gray-50 transition-all duration-200 px-5 py-2.5 rounded-xl ring-1 ring-gray-200 text-sm font-medium inline-flex items-center gap-2 shadow-sm hover:shadow"
              >
                <Archive className="w-4 h-4" />
                {showArchived ? "Show Active" : "Show Archived"}
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard label="Total Promos" value={total} color="gray" icon={<Percent className="w-5 h-5" />} />
            <KpiCard label="Active" value={active} color="green" icon={<CheckCircle2 className="w-5 h-5" />} />
            <KpiCard label="Scheduled" value={scheduled} color="yellow" icon={<Clock className="w-5 h-5" />} />
            <KpiCard label="Paused" value={paused} color="amber" icon={<Pause className="w-5 h-5" />} />
            <KpiCard label="Expired" value={expired} color="brown" icon={<XCircle className="w-5 h-5" />} />
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[300px] bg-white rounded-xl shadow-sm ring-1 ring-gray-200 px-4 py-3 flex items-center gap-3 hover:ring-gray-300 transition-all">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by code or name..."
                className="outline-none bg-transparent flex-1 text-sm placeholder:text-gray-400"
              />
            </div>

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-4 py-3 rounded-xl ring-1 ring-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:ring-gray-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            >
              <option value="">All types</option>
              <option>Percentage</option>
              <option>Fixed Amount</option>
              <option>Free Shipping</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 rounded-xl ring-1 ring-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:ring-gray-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
            >
              <option value="">All status</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Scheduled</option>
              <option>Expired</option>
            </select>

            <button
              onClick={() => setPage(1)}
              className="px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium shadow-sm hover:shadow transition-all inline-flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>

          {/* Create Form */}
          <div className="mb-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-600" />
              Create New Promo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Promo Code *</label>
                <Field name="code" value={form.code} onChange={onChange} placeholder="SUMMER2025" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Internal Label *</label>
                <Field name="name" value={form.name} onChange={onChange} placeholder="Summer Sale 2025" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                  <option>Free Shipping</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {form.type === "Percentage" ? "Percentage (1-99%)" : form.type === "Fixed Amount" ? "Amount (₱)" : "Value"}
                </label>
                <Field
                  name="value"
                  type="number"
                  value={form.value}
                  onChange={onChange}
                  placeholder={form.type === "Percentage" ? "10" : form.type === "Fixed Amount" ? "100" : "0"}
                  disabled={form.type === "Free Shipping"}
                  error={valueError}
                />
                {valueError && (
                  <p className="text-xs text-red-600 mt-1">
                    {form.type === "Percentage" ? "Must be 1-99%" : "Must be 0-₱10,000"}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Spend (₱50+)</label>
                <Field
                  name="minSpend"
                  type="number"
                  value={form.minSpend}
                  onChange={onChange}
                  placeholder="500"
                  error={minSpendError}
                />
                {minSpendError && <p className="text-xs text-red-600 mt-1">Must be at least ₱50</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Max Discount (₱50-1000 or 0)</label>
                <Field
                  name="maxDiscount"
                  type="number"
                  value={form.maxDiscount}
                  onChange={onChange}
                  placeholder="0"
                  error={maxDiscountError}
                />
                {maxDiscountError && <p className="text-xs text-red-600 mt-1">Must be ₱50-1,000 or 0 for no cap</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Usage Limit (0 = unlimited)</label>
                <Field
                  name="limit"
                  type="number"
                  value={form.limit}
                  onChange={onChange}
                  placeholder="0"
                  error={limitError}
                />
                {limitError && <p className="text-xs text-red-600 mt-1">Cannot exceed 10,000</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option>Active</option>
                  <option>Paused</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  Start Date (Optional)
                </label>
                <Field
                  name="startsAt"
                  type="date"
                  value={form.startsAt}
                  onChange={onChange}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  End Date (Optional)
                </label>
                <Field
                  name="endsAt"
                  type="date"
                  value={form.endsAt}
                  onChange={onChange}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={createPromo}
                disabled={valueError || minSpendError || maxDiscountError || limitError}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all"
              >
                Create Promo
              </button>
            </div>
          </div>

          {/* Promos Table */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Used</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"></div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        No promos found
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((promo) => {
                      const toggleBtn = getToggleButton(promo);
                      return (
                        <tr key={promo._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                              {promo.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {promo.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {promo.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-amber-700">
                            {promo.type === "Percentage"
                              ? `${promo.value}%`
                              : promo.type === "Fixed Amount"
                              ? peso(promo.value)
                              : "Free"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statusPill(promo._displayStatus)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {promo.used || 0} / {promo.limit || "∞"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              {toggleBtn && (
                                <button
                                  onClick={toggleBtn.action}
                                  className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                  title={toggleBtn.text}
                                >
                                  {toggleBtn.icon}
                                </button>
                              )}
                              {promo._displayStatus === "Expired" && !promo.archived && (
                                <button
                                  onClick={() => openReactivate(promo)}
                                  className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                                  title="Reactivate"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => openDetails(promo)}
                                className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => duplicate(promo._id)}
                                className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {!promo.archived ? (
                                <button
                                  onClick={() => archive(promo._id)}
                                  className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                                  title="Archive"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => unarchive(promo._id)}
                                  className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                                  title="Unarchive"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => remove(promo._id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-lg text-sm font-medium ring-1 ring-gray-200 transition"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-lg text-sm font-medium ring-1 ring-gray-200 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {detailsOpen && detailsPromo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={closeDetails}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Promo Details</h3>
                <button
                  onClick={closeDetails}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Code</p>
                    <p className="font-mono text-lg font-bold text-green-700">{detailsPromo.code}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Status</p>
                    {statusPill(detailsPromo._displayStatus)}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-gray-500 mb-1">Internal Name</p>
                  <p className="text-gray-900">{detailsPromo.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Type</p>
                    <p className="text-gray-900">{detailsPromo.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Value</p>
                    <p className="text-amber-700 font-bold">
                      {detailsPromo.type === "Percentage"
                        ? `${detailsPromo.value}%`
                        : detailsPromo.type === "Fixed Amount"
                        ? peso(detailsPromo.value)
                        : "Free Shipping"}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Min Spend</p>
                    <p className="text-gray-900">{peso(detailsPromo.minSpend || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Max Discount</p>
                    <p className="text-gray-900">{detailsPromo.maxDiscount ? peso(detailsPromo.maxDiscount) : "No cap"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Usage</p>
                    <p className="text-gray-900">{detailsPromo.used || 0} / {detailsPromo.limit || "Unlimited"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Archived</p>
                    <p className="text-gray-900">{detailsPromo.archived ? "Yes" : "No"}</p>
                  </div>
                </div>
                
                {detailsPromo.startsAt && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">Start Date</p>
                    <p className="text-gray-900">{new Date(detailsPromo.startsAt).toLocaleDateString()}</p>
                  </div>
                )}
                
                {detailsPromo.endsAt && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 mb-1">End Date</p>
                    <p className="text-gray-900">{new Date(detailsPromo.endsAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeDetails}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Modal */}
      {reactivateOpen && reactivateTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setReactivateOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reactivate Promo</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set new dates to reactivate <span className="font-mono font-bold text-green-700">{reactivateTarget.code}</span>
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Start Date</label>
                <Field
                  name="startsAt"
                  type="date"
                  value={sched.startsAt}
                  onChange={(e) => setSched({ ...sched, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">New End Date</label>
                <Field
                  name="endsAt"
                  type="date"
                  value={sched.endsAt}
                  onChange={(e) => setSched({ ...sched, endsAt: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReactivateOpen(false)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium ring-1 ring-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveReactivate}
                disabled={savingReactivate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition"
              >
                {savingReactivate ? "Saving..." : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Promo;