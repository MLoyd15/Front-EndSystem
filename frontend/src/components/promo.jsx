import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Percent,
  Search,
  Filter,
  Copy,
  PauseCircle,
  PlayCircle,
  Trash2,
  Archive,
} from "lucide-react";

/* ---------------- CONFIG ---------------- */
const API = "http://localhost:5000/api/promo";
const auth = () => ({ Authorization: `Bearer ${localStorage?.getItem("pos-token") || ""}` });

/* ---------------- Small UI helpers ---------------- */
const peso = (n) =>
  `₱${(Number(n || 0)).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

const Chip = ({ tone = "gray", children }) => {
  const tones = {
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    red: "bg-red-100 text-red-700 ring-red-200",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
};

const Field = (props) => (
  <input
    {...props}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm 
               placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
  />
);

/* ---------------- Component ---------------- */
const Promo = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // filters
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // form
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "Percentage",
    value: 10,
    minSpend: 0,
    maxDiscount: 0,
    limit: 0,
    startsAt: "",
    endsAt: "",
    status: "Active",
  });
  const isFree = form.type === "Free Shipping";
  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* ----- fetch ----- */
  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}?q=${encodeURIComponent(q)}`, { headers: auth() });
      setPromos(res.data || []);
    } catch (err) {
      console.error("Error loading promos", err);
      // If API is not available, start with empty array
      if (err.code === 'ERR_NETWORK' || err.response?.status === 404) {
        setPromos([]);
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  /* ----- actions ----- */
  const createPromo = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, value: isFree ? 0 : Number(form.value || 0) };
      await axios.post(API, payload, { headers: auth() });
      setForm({
        code: "",
        name: "",
        type: "Percentage",
        value: 10,
        minSpend: 0,
        maxDiscount: 0,
        limit: 0,
        startsAt: "",
        endsAt: "",
        status: "Active",
      });
      load();
    } catch (err) {
      console.error("Error creating promo", err);
      alert(err.response?.data?.message || "Error creating promo. Check if your backend is running.");
    }
  };

    const togglePause = async (id, currentStatus) => {
    try {
      if (currentStatus === "Scheduled") {
        // use toggle endpoint with forceActivate flag
        await axios.patch(`${API}/${id}/toggle`, { forceActivate: true }, { headers: auth() });
      } else {
        // normal toggle between Active/Paused
        await axios.patch(`${API}/${id}/toggle`, {}, { headers: auth() });
      }
      load();
    } catch (err) {
      console.error("Error toggling promo status", err.response?.data || err);
      alert(err.response?.data?.message || "Error updating promo status. Check if your backend is running.");
    }
  };

  const archivePromo = async (id) => {
    try {
      await axios.patch(`${API}/${id}`, { archived: true }, { headers: auth() });
      load();
    } catch (err) {
      console.error("Error archiving promo", err);
      alert("Error archiving promo. Check if your backend is running.");
    }
  };

  const duplicate = async (id) => {
    try {
      await axios.post(`${API}/${id}/duplicate`, {}, { headers: auth() });
      load();
    } catch (err) {
      console.error("Error duplicating promo", err);
      alert("Error duplicating promo. Check if your backend is running.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this promo?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: auth() });
      load();
    } catch (err) {
      console.error("Error deleting promo", err);
      alert("Error deleting promo. Check if your backend is running.");
    }
  };

  /* ----- derived display helpers ----- */
  const rows = useMemo(() => {
    const now = new Date();
    const mapped = (promos || []).map((p) => {
      const starts = p.startsAt ? new Date(p.startsAt) : null;
      const ends = p.endsAt ? new Date(p.endsAt) : null;
      let status = p.status || "Active";
      
      // Time-based status override (but respect manual status changes)
      if (p.status === "Active" && starts && now < starts) status = "Scheduled";
      if (ends && now > ends) status = "Expired";
      
      return { ...p, _displayStatus: status };
    });

    // Filter based on archive view
    const filtered = mapped.filter((p) => {
      const isArchived = p.archived || p._displayStatus === "Expired";
      return showArchived ? isArchived : !isArchived;
    });

    return filtered.filter((p) => {
      const matchType = !type || p.type === type;
      const matchStatus = !statusFilter || p._displayStatus === statusFilter;
      const matchSearch = !q || p.code.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase());
      return matchType && matchStatus && matchSearch;
    });
  }, [promos, type, statusFilter, q, showArchived]);

  // KPIs
  const total = rows.length;
  const active = rows.filter((r) => r._displayStatus === "Active").length;
  const paused = rows.filter((r) => r._displayStatus === "Paused").length;
  const scheduled = rows.filter((r) => r._displayStatus === "Scheduled").length;
  const expired = rows.filter((r) => r._displayStatus === "Expired").length;

  const renderValue = (row) => {
    if (row.type === "Percentage") return `${row.value}%`;
    if (row.type === "Free Shipping") return "Free Shipping";
    return peso(row.value);
  };

  const statusPill = (s) => {
    if (s === "Active") return <Chip tone="green">Active</Chip>;
    if (s === "Paused") return <Chip tone="amber">Paused</Chip>;
    if (s === "Scheduled") return <Chip tone="sky">Scheduled</Chip>;
    if (s === "Expired") return <Chip tone="red">Expired</Chip>;
    return <Chip tone="gray">{s}</Chip>;
  };

  // Helper function to determine if promo can be activated/paused
  const canToggle = (status) => {
    return status !== "Expired";
  };

  // Helper function to get toggle button content
  const getToggleButton = (promo) => {
    const status = promo._displayStatus;
    
    if (status === "Active") {
      return {
        icon: <PauseCircle className="h-3.5 w-3.5" />,
        text: "Pause",
        action: () => togglePause(promo._id, status)
      };
    } else if (status === "Paused" || status === "Scheduled") {
      return {
        icon: <PlayCircle className="h-3.5 w-3.5" />,
        text: "Activate",
        action: () => togglePause(promo._id, status)
      };
    }
    
    return null;
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-6">
        {/* Title */}
        <div className="pt-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Product Promo & Discounts
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Configure the discount, limits, and schedule.
              </p>
            </div>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="bg-white hover:bg-slate-50 transition px-4 py-2 rounded-xl ring-1 ring-slate-200 text-sm inline-flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              {showArchived ? "Show Active" : "Show Archived"}
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="Total Promos" value={total} dotClass="bg-emerald-500" />
          <Kpi label="Active" value={active} dotClass="bg-emerald-500" />
          <Kpi label="Scheduled" value={scheduled} dotClass="bg-sky-500" />
          <Kpi label="Paused" value={paused} dotClass="bg-amber-500" />
          <Kpi label="Expired" value={expired} dotClass="bg-rose-500" />
        </div>

        {/* Filters row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] bg-white rounded-xl shadow-sm ring-1 ring-slate-200 px-3 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code or name…"
              className="outline-none bg-transparent flex-1 text-sm"
            />
          </div>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
          >
            <option value="">All types</option>
            <option>Percentage</option>
            <option>Fixed Amount</option>
            <option>Free Shipping</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
          >
            <option value="">All status</option>
            <option>Active</option>
            <option>Paused</option>
            <option>Scheduled</option>
            {showArchived && <option>Expired</option>}
          </select>

          <button
            onClick={load}
            className="bg-white hover:bg-slate-50 transition px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm inline-flex items-center gap-2"
          >
            <Filter className="w-4 h-4" /> Apply
          </button>
        </div>

        {/* Main content: table + right sidebar (70/30 split) */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 pb-24">
          {/* Table card */}
          <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr className="text-[12px] uppercase tracking-wide">
                    {[
                      "Code",
                      "Name",
                      "Type",
                      "Value",
                      "Min Spend",
                      "Used / Limit",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                        Loading promos…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-slate-500">
                        {showArchived ? "No archived promos found." : "No promos found."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((p, idx) => {
                      const toggleButton = getToggleButton(p);
                      
                      return (
                        <tr
                          key={p._id}
                          className={`border-b border-slate-200 ${idx % 2 ? "bg-white" : "bg-slate-50/40"} hover:bg-emerald-50/30 transition`}
                        >
                          <td className="px-5 py-3 font-mono text-xs text-slate-700">{p.code}</td>
                          <td className="px-5 py-3 text-slate-800">{p.name}</td>
                          <td className="px-5 py-3">{p.type}</td>
                          <td className="px-5 py-3">{renderValue(p)}</td>
                          <td className="px-5 py-3">{p.minSpend ? peso(p.minSpend) : "—"}</td>
                          <td className="px-5 py-3">{Number(p.used || 0)}/{Number(p.limit || 0) || "∞"}</td>
                          <td className="px-5 py-3">{statusPill(p._displayStatus)}</td>
                          <td className="px-5 py-2">
                            <div className="flex flex-wrap gap-2">
                              {!showArchived && (
                                <button
                                  onClick={() => duplicate(p._id)}
                                  className="inline-flex items-center gap-1 rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Copy
                                </button>
                              )}
                              
                              {/* Only show toggle button if promo is not expired and not in archive view */}
                              {!showArchived && canToggle(p._displayStatus) && toggleButton && (
                                <button
                                  onClick={toggleButton.action}
                                  className="inline-flex items-center gap-1 rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  {toggleButton.icon}
                                  {toggleButton.text}
                                </button>
                              )}

                              {/* Archive button for expired promos */}
                              {p._displayStatus === "Expired" && !p.archived && !showArchived && (
                                <button
                                  onClick={() => archivePromo(p._id)}
                                  className="inline-flex items-center gap-1 rounded-lg ring-1 ring-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Archive
                                </button>
                              )}
                              
                              <button
                                onClick={() => remove(p._id)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs text-white hover:bg-rose-500"
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
          </div>

          {/* Create promo card - only show if not in archive view */}
          {!showArchived && (
            <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-5 h-max">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                  <Percent className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">Create Promo</h2>
              </div>

              <div className="mt-3 space-y-3">
                <section className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-0.5">Promo code</label>
                    <Field name="code" value={form.code} onChange={onChange} placeholder="e.g., SAVE10" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-0.5">Internal label (for admins)</label>
                    <Field name="name" value={form.name} onChange={onChange} placeholder="Short name" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">Discount type</label>
                      <select
                        name="type"
                        value={form.type}
                        onChange={onChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <option>Percentage</option>
                        <option>Fixed Amount</option>
                        <option>Free Shipping</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">
                        {form.type === "Percentage"
                          ? "Discount value (%)"
                          : form.type === "Fixed Amount"
                          ? "Discount value (amount)"
                          : "Value"}
                      </label>
                      <Field
                        name="value"
                        type="number"
                        value={form.value}
                        onChange={onChange}
                        placeholder={form.type === "Percentage" ? "e.g., 10" : form.type === "Fixed Amount" ? "e.g., 100" : "Not required"}
                        disabled={form.type === "Free Shipping"}
                      />
                    </div>
                  </div>
                </section>
                <div className="my-2 border-t border-slate-100" />
                <section className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">Minimum spend</label>
                      <Field name="minSpend" type="number" value={form.minSpend} onChange={onChange} placeholder="0" />
                      <p className="mt-0.5 text-[11px] text-slate-500">Minimum cart subtotal required</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">Max discount</label>
                      <Field name="maxDiscount" type="number" value={form.maxDiscount} onChange={onChange} placeholder="0" />
                      <p className="mt-0.5 text-[11px] text-slate-500">Cap the discount amount (0 = no cap)</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-0.5">Usage limit</label>
                    <Field name="limit" type="number" value={form.limit} onChange={onChange} placeholder="0" />
                    <p className="mt-0.5 text-[11px] text-slate-500">How many times this code can be used (0 = unlimited)</p>
                  </div>
                </section>

                <div className="my-2 border-t border-slate-100" />

                <section className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-0.5">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={onChange}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option>Active</option>
                      <option>Paused</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">Start date</label>
                      <input
                        type="date"
                        name="startsAt"
                        value={form.startsAt}
                        onChange={onChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-0.5">End date</label>
                      <input
                        type="date"
                        name="endsAt"
                        value={form.endsAt}
                        onChange={onChange}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                </section>

                <button
                  onClick={createPromo}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  + Add Promo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------- tiny KPI card component ------------- */
const Kpi = ({ label, value, dotClass }) => (
  <div className="bg-white rounded-2xl shadow-md ring-1 ring-slate-200 p-4 flex items-center gap-3">
    <span className={`w-3.5 h-3.5 rounded-full ${dotClass}`} />
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
    </div>
  </div>
);

export default Promo;



