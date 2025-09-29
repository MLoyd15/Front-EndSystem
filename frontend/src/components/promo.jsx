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
const API = VITE_API_BASE;
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token") || ""}` });

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
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
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
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-500"
  />
);

const KpiCard = ({ label, value, color, icon }) => {
  const colorClasses = {
    slate: "from-slate-500 to-slate-600",
    emerald: "from-emerald-500 to-emerald-600",
    sky: "from-sky-500 to-sky-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200/50 p-5 hover:shadow-lg transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
          <div className="text-3xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- Component ---------------- */
const Promo = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showArchived, setShowArchived] = useState(false); // false = active view, true = archived (Expired only)
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // create form
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

  // reactivate modal
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [savingReactivate, setSavingReactivate] = useState(false);
  const [sched, setSched] = useState({ startsAt: "", endsAt: "" });

  /* --------- API calls --------- */
  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}?q=${encodeURIComponent(q)}`, { headers: auth() });
      setPromos(res.data || []);
    } catch (e) {
      console.error("Load promos failed", e);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const createPromo = async () => {
    // numeric coercions
    const val = Number(form.value || 0);
    const minSpend = Number(form.minSpend || 0);
    const maxDiscount = Number(form.maxDiscount || 0);
    const limit = Number(form.limit || 0);

    // ************* FRONTEND VALIDATION (limiters) *************
    if (form.type === "Percentage") {
      if (val < 1) return alert("Percentage must be at least 1%");
      if (val > 99) return alert("Percentage cannot exceed 99%");
    }
    if (form.type === "Fixed Amount") {
      if (val < 0) return alert("Amount cannot be negative");
      if (val > 10000) return alert("Fixed amount cannot exceed ₱10,000");
    }
    if (limit !== 0 && limit > 10000) return alert("Usage limit cannot exceed 10,000 (or set 0 for unlimited)");
    if (minSpend < 50) return alert("Minimum spend must be at least ₱50");
    if (maxDiscount !== 0 && maxDiscount > 1000) return alert("Max discount cannot exceed ₱1,000");

    try {
      const payload = {
        ...form,
        value: form.type === "Free Shipping" ? 0 : val,
        minSpend,
        maxDiscount,
        limit,
      };
      await axios.post(API, payload, { headers: auth() });
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
      alert(e?.response?.data?.message || "Error creating promo");
    }
  };

  const duplicate = async (id) => {
    try {
      await axios.post(`${API}/${id}/duplicate`, {}, { headers: auth() });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Error duplicating promo");
    }
  };

  const togglePause = async (p) => {
    try {
      const status = computeDisplayStatus(p);
      const body = status === "Scheduled" ? { forceActivate: true } : {};
      await axios.patch(`${API}/${p._id}/toggle`, body, { headers: auth() });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Error updating status");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this promo?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: auth() });
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Error deleting promo");
    }
  };

  // Reactivate
  const openReactivate = (p) => {
    setReactivateTarget(p);
    setSched({ startsAt: nowLocalInput(), endsAt: "" });
    setReactivateOpen(true);
  };
  const closeReactivate = () => {
    setReactivateOpen(false);
    setReactivateTarget(null);
  };
  const submitReactivate = async () => {
    const s = sched.startsAt ? new Date(sched.startsAt) : null;
    const e = sched.endsAt ? new Date(sched.endsAt) : null;
    if (!s || !e) return alert("Please pick both Start and End.");
    if (e <= s) return alert("End must be after Start.");
    try {
      setSavingReactivate(true);
      await axios.patch(
        `${API}/${reactivateTarget._id}/reactivate`,
        { startsAt: s.toISOString(), endsAt: e.toISOString() },
        { headers: auth() }
      );
      closeReactivate();
      load();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to reactivate promo");
    } finally {
      setSavingReactivate(false);
    }
  };

  /* --------- rows / filters / pagination --------- */
  const withDisplay = useMemo(
    () => (promos || []).map((p) => ({ ...p, _displayStatus: computeDisplayStatus(p) })),
    [promos]
  );

  // view switch: Active view hides Expired; Archive shows only Expired
  const viewRows = useMemo(
    () => withDisplay.filter((p) => (showArchived ? p._displayStatus === "Expired" : p._displayStatus !== "Expired")),
    [withDisplay, showArchived]
  );

  const rows = useMemo(() => {
    const qq = q.toLowerCase();
    return viewRows.filter((p) => {
      const matchSearch = !q || p.code.toLowerCase().includes(qq) || p.name.toLowerCase().includes(qq);
      const matchType = !type || p.type === type;
      const matchStatus = !statusFilter || p._displayStatus === statusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [viewRows, q, type, statusFilter]);

  useEffect(() => setPage(1), [showArchived, q, type, statusFilter, pageSize]);

  const total = rows.length;
  const active = rows.filter((p) => p._displayStatus === "Active").length;
  const scheduled = rows.filter((p) => p._displayStatus === "Scheduled").length;
  const paused = rows.filter((p) => p._displayStatus === "Paused").length;
  const expired = rows.filter((p) => p._displayStatus === "Expired").length;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  theStart: ;
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageRows = rows.slice(startIdx, endIdx);

  const renderValue = (p) => {
    if (p.type === "Percentage") return `${p.value}%`;
    if (p.type === "Fixed Amount") return peso(p.value);
    return "Free Shipping";
  };

  const statusPill = (status) => {
    const styles = {
      Active: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20",
      Scheduled: "bg-sky-100 text-sky-700 ring-1 ring-sky-600/20",
      Paused: "bg-amber-100 text-amber-700 ring-1 ring-amber-600/20",
      Expired: "bg-rose-100 text-rose-700 ring-1 ring-rose-600/20",
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

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Product Promo & Discounts
              </h1>
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Configure discounts, limits, and schedules for your promotions
              </p>
            </div>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="bg-white hover:bg-slate-50 transition-all duration-200 px-5 py-2.5 rounded-xl ring-1 ring-slate-200 text-sm font-medium inline-flex items-center gap-2 shadow-sm hover:shadow"
            >
              <Archive className="w-4 h-4" />
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard label="Total Promos" value={total} color="slate" icon={<Percent className="w-5 h-5" />} />
          <KpiCard label="Active" value={active} color="emerald" icon={<CheckCircle2 className="w-5 h-5" />} />
          <KpiCard label="Scheduled" value={scheduled} color="sky" icon={<Clock className="w-5 h-5" />} />
          <KpiCard label="Paused" value={paused} color="amber" icon={<Pause className="w-5 h-5" />} />
          <KpiCard label="Expired" value={expired} color="rose" icon={<XCircle className="w-5 h-5" />} />
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[300px] bg-white rounded-xl shadow-sm ring-1 ring-slate-200 px-4 py-3 flex items-center gap-3 hover:ring-slate-300 transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by code or name..."
              className="outline-none bg-transparent flex-1 text-sm placeholder:text-slate-400"
            />
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-4 py-3 rounded-xl ring-1 ring-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:ring-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="">All types</option>
            <option>Percentage</option>
            <option>Fixed Amount</option>
            <option>Free Shipping</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl ring-1 ring-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:ring-slate-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          >
            <option value="">All status</option>
            <option>Active</option>
            <option>Paused</option>
            <option>Scheduled</option>
            <option>Expired</option>
          </select>

          <button
            onClick={load}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all duration-200 px-5 py-3 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Filter className="w-4 h-4" /> Apply Filters
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 pb-12">
          {/* Table Section */}
          <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-200/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    {["Code", "Name", "Type", "Value", "Min Spend", "Used / Limit", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-slate-500">Loading promos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <AlertCircle className="w-12 h-12 text-slate-300" />
                          <span className="text-sm text-slate-500 font-medium">
                            {showArchived ? "No expired promos found" : "No promos found"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((p) => {
                      const status = computeDisplayStatus(p);
                      const toggleButton = getToggleButton({ ...p, _displayStatus: status });
                      return (
                        <tr key={p._id} className="hover:bg-emerald-50/30 transition-colors duration-150">
                          <td className="px-6 py-4">
                            <code className="px-2.5 py-1 bg-slate-100 rounded-md text-xs font-mono font-semibold text-slate-700">
                              {p.code}
                            </code>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.type}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-700">{renderValue(p)}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{p.minSpend ? peso(p.minSpend) : "—"}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-700">
                            {Number(p.used || 0)}/{Number(p.limit || 0) || "∞"}
                          </td>
                          <td className="px-6 py-4">{statusPill(status)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => duplicate(p._id)}
                                className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:ring-slate-300 transition-all"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </button>

                              {!showArchived && canToggle(status) && toggleButton && (
                                <button
                                  onClick={toggleButton.action}
                                  className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:ring-slate-300 transition-all"
                                >
                                  {toggleButton.icon}
                                  {toggleButton.text}
                                </button>
                              )}

                              {showArchived && status === "Expired" && (
                                <button
                                  onClick={() => openReactivate(p)}
                                  className="inline-flex items-center gap-1.5 rounded-lg ring-1 ring-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-all"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  Reactivate
                                </button>
                              )}

                              <button
                                onClick={() => remove(p._id)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 active:bg-rose-800 transition-all shadow-sm"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Showing <span className="font-bold text-slate-900">{total === 0 ? 0 : startIdx + 1}</span>–
                <span className="font-bold text-slate-900">{endIdx}</span> of{" "}
                <span className="font-bold text-slate-900">{total}</span> results
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg ring-1 ring-slate-200 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm font-medium text-slate-700">
                  Page <span className="font-bold text-slate-900">{page}</span> of <span className="font-bold">{pageCount}</span>
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="px-4 py-2 rounded-lg ring-1 ring-slate-200 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Create Promo Sidebar */}
          {!showArchived && (
            <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-200/50 p-6 h-max sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                  <Percent className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Create New Promo</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Promo Code</label>
                  <Field name="code" value={form.code} onChange={onChange} placeholder="e.g., SAVE20" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Label</label>
                  <Field name="name" value={form.name} onChange={onChange} placeholder="Admin reference name" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={onChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option>Percentage</option>
                      <option>Fixed Amount</option>
                      <option>Free Shipping</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {form.type === "Percentage" ? "Discount (%)" : form.type === "Fixed Amount" ? "Amount (₱)" : "Value"}
                    </label>
                    <Field
                      name="value"
                      type="number"
                      value={form.value}
                      onChange={onChange}
                      placeholder={form.type === "Percentage" ? "10" : form.type === "Fixed Amount" ? "100" : "—"}
                      disabled={form.type === "Free Shipping"}
                      min={form.type === "Percentage" ? 1 : 0}
                      max={form.type === "Percentage" ? 99 : form.type === "Fixed Amount" ? 10000 : undefined}
                      step="1"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Min Spend</label>
                      <Field
                        name="minSpend"
                        type="number"
                        value={form.minSpend}
                        onChange={onChange}
                        placeholder="50"
                        min={50}
                        step="1"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">Minimum cart value (≥ ₱50)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Max Discount</label>
                      <Field
                        name="maxDiscount"
                        type="number"
                        value={form.maxDiscount}
                        onChange={onChange}
                        placeholder="0"
                        max={1000}
                        step="1"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">Cap at ₱1,000 (0 = no cap)</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Usage Limit</label>
                    <Field
                      name="limit"
                      type="number"
                      value={form.limit}
                      onChange={onChange}
                      placeholder="0"
                      max={10000}
                      step="1"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Max 10,000 uses (0 = unlimited)</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={onChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        name="startsAt"
                        value={form.startsAt}
                        onChange={onChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                      <input
                        type="date"
                        name="endsAt"
                        value={form.endsAt}
                        onChange={onChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={createPromo}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 active:scale-[0.98] transition-all duration-200"
                >
                  + Add Promo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reactivate Modal */}
      {reactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeReactivate} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Reactivate Promo</h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Set new schedule for{" "}
                    <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
                      {reactivateTarget?.code}
                    </code>
                  </p>
                </div>
              </div>
              <button
                onClick={closeReactivate}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSched((x) => ({ ...x, startsAt: nowLocalInput() }))}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  Start Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const s = nowLocalInput();
                    const d = new Date();
                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                    d.setDate(d.getDate() + 7);
                    const e = d.toISOString().slice(0, 16);
                    setSched({ startsAt: s, endsAt: e });
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  +7 Days
                </button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={sched.startsAt}
                  onChange={(e) => setSched((x) => ({ ...x, startsAt: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={sched.endsAt}
                  onChange={(e) => setSched((x) => ({ ...x, endsAt: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeReactivate}
                className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitReactivate}
                disabled={savingReactivate}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold text-sm hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {savingReactivate ? "Reactivating..." : "Reactivate Promo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promo;
