// src/components/promo.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Percent,
  Search,
  Calendar,
  Copy,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";

/* ---------------- CONFIG ---------------- */
const API = "http://localhost:5000/api/promo";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token")}` });

/* ---------------- Small UI helpers ---------------- */
const peso = (n) =>
  `₱${(Number(n || 0)).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

const Chip = ({ tone = "gray", children }) => {
  const tones = {
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded-md ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
};

const Field = (props) => (
  <input
    {...props}
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
               placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
  />
);

/* ---------------- Component ---------------- */
const Promo = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
  code: "",
  name: "",
  type: "Percentage",
  value: "",
  minSpend: "",
  maxDiscount: "",
  limit: "",
  startsAt: "",
  endsAt: "",
  status: "Active",
});

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  /* ----- fetch ----- */
  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}?q=${encodeURIComponent(q)}`, {
        headers: auth(),
      });
      setPromos(res.data || []);
    } catch (err) {
      console.error("Error loading promos", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [q]);

  /* ----- actions ----- */
  const createPromo = async (e) => {
    e.preventDefault();
    try {
      await axios.post(API, form, { headers: auth() });
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
      alert(err.response?.data?.message || "Error creating promo");
    }
  };

  const togglePause = async (id) => {
    await axios.patch(`${API}/${id}/toggle`, {}, { headers: auth() });
    load();
  };

  const duplicate = async (id) => {
    await axios.post(`${API}/${id}/duplicate`, {}, { headers: auth() });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this promo?")) return;
    await axios.delete(`${API}/${id}`, { headers: auth() });
    load();
  };

  /* ----- derived display helpers ----- */
  const computedRows = useMemo(() => {
    const now = new Date();
    return promos.map((p) => {
      const starts = p.startsAt ? new Date(p.startsAt) : null;
      const ends = p.endsAt ? new Date(p.endsAt) : null;
      let status = p.status || "Active";
      if (starts && now < starts) status = "Scheduled";
      if (ends && now > ends) status = "Expired";
      return { ...p, _displayStatus: status };
    });
  }, [promos]);

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-white py-8">
      {/* Full width, no max constraint */}
      <div className="px-6 w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Percent className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-gray-900">
              Discounts & Promotions
            </h1>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code or name..."
              className="w-full rounded-full border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm 
                         text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Full-width fluid grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[4fr_1fr]">
          {/* Left: Table */}
          <div className="rounded-xl bg-white shadow-sm border border-black/20">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-600">
                    {[
                      "Code",
                      "Name",
                      "Type",
                      "Value",
                      "Min Spend",
                      "Used/Limit",
                      "Status",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="px-5 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-6 text-center text-gray-500">
                        Loading promos…
                      </td>
                    </tr>
                  ) : computedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-6 text-center text-gray-500">
                        No promos found.
                      </td>
                    </tr>
                  ) : (
                    computedRows.map((p) => (
                      <tr
                        key={p._id}
                        className="border-t border-gray-100 hover:bg-gray-50/70"
                      >
                        <td className="px-5 py-4 font-mono text-xs">{p.code}</td>
                        <td className="px-5 py-4">{p.name}</td>
                        <td className="px-5 py-4">{p.type}</td>
                        <td className="px-5 py-4">
                          {p.type === "Percentage"
                            ? `${p.value}%`
                            : p.type === "Free Shipping"
                            ? "Free Shipping"
                            : peso(p.value)}
                        </td>
                        <td className="px-5 py-4">
                          {p.minSpend ? peso(p.minSpend) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {Number(p.used || 0)}/{Number(p.limit || 0)}
                        </td>
                        <td className="px-5 py-4">
                          {p._displayStatus === "Active" && (
                            <Chip tone="green">Active</Chip>
                          )}
                          {p._displayStatus === "Paused" && (
                            <Chip tone="amber">Paused</Chip>
                          )}
                          {p._displayStatus === "Scheduled" && (
                            <Chip tone="sky">Scheduled</Chip>
                          )}
                          {p._displayStatus === "Expired" && (
                            <Chip tone="gray">Expired</Chip>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => duplicate(p._id)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              <Copy className="h-3.5 w-3.5" /> Copy
                            </button>
                            <button
                              onClick={() => togglePause(p._id)}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              {p._displayStatus === "Active" ? (
                                <>
                                  <PauseCircle className="h-3.5 w-3.5" /> Pause
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-3.5 w-3.5" /> Activate
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => remove(p._id)}
                              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs text-white hover:bg-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/*Section where you add the promo*/}
          <div className="rounded-xl bg-white shadow-sm border border-black/20 p-5 self-start">
            <div className="mb-4 flex items-center gap-2">
              <Percent className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-semibold text-gray-900">Create Promo</h2>
            </div>

            <form onSubmit={createPromo} className="space-y-3">
              <Field name="code" value={form.code} onChange={onChange} placeholder="e.g., SAVE10" />
              <Field name="name" value={form.name} onChange={onChange} placeholder="Internal label" />

              <div className="grid grid-cols-2 gap-3">
                <select
                  name="type"
                  value={form.type}
                  onChange={onChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option>Percentage</option>
                  <option>Fixed Amount</option>
                  <option>Free Shipping</option>
                </select>
                <Field
                  name="value"
                  type="number"
                  value={form.value}
                  onChange={onChange}
                  placeholder="10"
                />
              </div>

              <Field
                name="minSpend"
                type="number"
                value={form.minSpend}
                onChange={onChange}
                placeholder="Min Spend"
              />
              <Field
                name="maxDiscount"
                type="number"
                value={form.maxDiscount}
                onChange={onChange}
                placeholder="Max Discount"
              />
              <Field
                name="limit"
                type="number"
                value={form.limit}
                onChange={onChange}
                placeholder="Usage Limit"
              />
              

              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option>Active</option>
                <option>Paused</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  name="startsAt"
                  value={form.startsAt}
                  onChange={onChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                  type="date"
                  name="endsAt"
                  value={form.endsAt}
                  onChange={onChange}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-md bg-emerald-600 py-2 text-sm font-medium text-white shadow hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                + Add Promo
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Promo;



