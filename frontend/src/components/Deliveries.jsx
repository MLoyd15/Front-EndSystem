import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Bike, Search, Filter, Clock, MapPin, User, Weight,
  Phone, ChevronRight, X, CheckCircle2
} from "lucide-react";

/* ----------------------------- CONFIG ----------------------------- */
const API = "http://localhost:5000/api/delivery";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token")}` });

/* ---------------------------- HELPERS ----------------------------- */
const chip = (color, text) => {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${colors[color]}`}>{text}</span>;
};

const statusPill = (status) => {
  const map = {
    pending: ["gray", "Pending"],
    assigned: ["sky", "Assigned"],
    "in-transit": ["amber", "In transit"],
    completed: ["green", "Completed"],
    cancelled: ["gray", "Cancelled"],
  };
  const [c, label] = map[status] || map.pending;
  return chip(c, label);
};

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const last6 = (id = "") => `#${String(id).slice(-6)}`;
const currency = (n) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(n || 0));

/* --------------------------- COMPONENT ---------------------------- */
export default function Deliveries() {
  const [tab, setTab] = useState("pickup");     // 'pickup' | 'in-house' | 'third-party'
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [editing, setEditing] = useState(null);

  // Load deliveries (server filters only for status/search)
  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (query) params.q = query.trim();
      const { data } = await axios.get(API, { headers: auth(), params });
      setRows(Array.isArray(data) ? data : (data?.deliveries || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, status]);

  // Client-side type filter by tab, then local search
  const filtered = useMemo(() => {
    const typeKey = String(tab).toLowerCase();
    const byTab = rows.filter(r => String(r.type || "").toLowerCase() === typeKey);

    if (!query) return byTab;

    const q = query.toLowerCase();
    return byTab.filter((r) => {
      const addr = (r.deliveryAddress || "").toLowerCase();
      const pick = (r.pickupLocation || "").toLowerCase();
      const prov = (r.thirdPartyProvider || "").toLowerCase();
      const drv = (r.assignedDriver || "").toLowerCase();
      const veh = (r.assignedVehicle || "").toLowerCase();
      const id = String(r._id || "").toLowerCase();
      return [addr, pick, prov, drv, veh, id].some((t) => t.includes(q));
    });
  }, [rows, query, tab]);

  const headerTitle =
    tab === "pickup" ? "Customer Pickups" :
    tab === "in-house" ? "In-house Deliveries" :
    "Third-party Deliveries";

  const tabColors = {
    "pickup": "bg-emerald-600",
    "in-house": "bg-amber-600",
    "third-party": "bg-sky-600",
  };

  const onQuickStatus = async (id, st) => {
    await axios.put(`${API}/${id}`, { status: st }, { headers: auth() });
    load();
  };

  const onSavePickup = async (id, values) => {
    const body = {};
    if ("scheduledDate" in values) body.scheduledDate = values.scheduledDate ? new Date(values.scheduledDate) : null;
    if ("pickupLocation" in values) body.pickupLocation = values.pickupLocation;
    await axios.put(`${API}/${id}`, body, { headers: auth() });
    setEditing(null);
    load();
  };

  const onSaveThirdParty = async (id, provider) => {
    await axios.put(`${API}/${id}`, { thirdPartyProvider: provider }, { headers: auth() });
    setEditing(null);
    load();
  };

  /* ------------------------------ UI ------------------------------ */
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-8">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-emerald-600" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Delivery Management</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "pickup", label: "Pickup", Icon: Package },
            { key: "in-house", label: "In-house", Icon: Package },
            { key: "third-party", label: "3rd-Party", Icon: Bike },
          ].map(({ key, label, Icon }) => {
            const selected = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ring-1 transition
                  ${selected ? `${tabColors[key]} text-white ring-transparent`
                             : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Heading + Search Row */}
        <div className="flex flex-col gap-4 items-start">
          <h2 className={`px-4 py-2 rounded-lg text-lg font-semibold text-white ${tabColors[tab]}`}>
            {headerTitle}
          </h2>

          <div className="flex items-center gap-3 w-full max-w-3xl">
            <div className="flex-1 bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 px-3 py-2 text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="Search address, pickup location, provider, driver, vehicle, id…"
                className="outline-none bg-transparent flex-1 text-sm"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-xl ring-1 ring-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50"
            >
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in-transit">In transit</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={load}
              className="bg-white hover:bg-slate-50 transition px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm inline-flex items-center gap-2"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-2 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-100 p-4">
              {loading ? (
                <div className="p-6 text-slate-500">Loading…</div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {filtered.map((d) => (
                      <motion.div
                        key={d._id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="p-4 rounded-2xl ring-1 ring-slate-200 bg-white hover:shadow-lg transition"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          {/* id + status */}
                          <div className="flex items-center gap-2 min-w-[8rem]">
                            <span className="font-semibold text-slate-800">{last6(d._id)}</span>
                            {statusPill(d.status)}
                          </div>

                          {/* compact info */}
                          <div className="flex items-center gap-2 text-slate-600 min-w-[13rem]">
                            <User className="w-4 h-4" />
                            <span className="truncate">
                              {d.thirdPartyProvider || d.assignedDriver || "—"}
                            </span>
                          </div>

                          {/* address/pickup */}
                          <div className="flex items-center gap-2 text-slate-600 min-w-[14rem]">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">
                              {tab !== "third-party"
                                ? (d.pickupLocation || "Set pickup location")
                                : (d.deliveryAddress || "Delivery address")}
                            </span>
                          </div>

                          {/* schedule */}
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4" />
                            <span>{fmtDateTime(d.scheduledDate)}</span>
                          </div>

                          {/* weight placeholder */}
                          <div className="flex items-center gap-2 text-slate-600">
                            <Weight className="w-4 h-4" />
                            <span>0 kg</span>
                          </div>

                          {/* actions */}
                          <div className="ml-auto flex items-center gap-2">
                            {d.assignedDriver || d.assignedVehicle
                              ? chip("sky", "Assigned")
                              : chip("gray", "Unassigned")}

                            <button
                              onClick={() => setDrawer(d)}
                              className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
                            >
                              Details <ChevronRight className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setEditing(d)}
                              className="px-3 py-1.5 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Manage
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Right: editor */}
          <div className="lg:col-span-1">
            <div
              className={`rounded-3xl shadow-xl ring-1 p-5 
                ${tab === "pickup" ? "bg-emerald-50 ring-emerald-200" : ""}
                ${tab === "in-house" ? "bg-amber-50 ring-amber-200": ""}
                ${tab === "third-party" ? "bg-sky-100 ring-sky-200" : ""}`}
            >
              <h3
                className={`font-semibold mb-4 flex items-center gap-2
                  ${tab === "pickup" ? "text-black" : ""}
                  ${tab === "in-house" ? "text-black" : ""}
                  ${tab === "third-party" ? "text-black" : ""}`}
              >
                {tab === "pickup"
                  ? "Pickup Scheduler"
                  : tab === "in-house"
                  ? "In-House Scheduler"
                  : "3rd-Party Booking"}
              </h3>

              {!editing ? (
                <p className="text-sm text-slate-600">
                  Select a delivery and click <b>Manage</b>.
                </p>
              ) : tab === "pickup" ? (
                <PickupEditor
                  row={editing}
                  onCancel={() => setEditing(null)}
                  onSave={(v) => onSavePickup(editing._id, v)}
                  onQuickStatus={(st) => onQuickStatus(editing._id, st)}
                />
              ) : (
                <ThirdPartyEditor
                  row={editing}
                  onCancel={() => setEditing(null)}
                  onSave={(provider) => onSaveThirdParty(editing._id, provider)}
                  onQuickStatus={(st) => onQuickStatus(editing._id, st)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer: delivery details */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setDrawer(null)}
          >
            <motion.div
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl ring-1 ring-slate-200 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Delivery {last6(drawer._id)}</h3>
                <button onClick={() => setDrawer(null)} className="p-2 rounded-xl hover:bg-slate-50"><X className="w-5 h-5" /></button>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium">Type:</span>
                  <span>{drawer.type || "—"}</span>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium">Status:</span>
                  <span>{statusPill(drawer.status)}</span>
                </div>

                <div className="flex items-start gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <div>
                    <div><span className="font-medium">Pickup:</span> {drawer.pickupLocation || "—"}</div>
                    <div><span className="font-medium">Delivery:</span> {drawer.deliveryAddress || "—"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="w-4 h-4" />
                  <div>{fmtDateTime(drawer.scheduledDate)}</div>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium">Provider:</span>
                  <div>{drawer.thirdPartyProvider || "—"}</div>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium">Driver:</span>
                  <div>{drawer.assignedDriver || "—"}</div>
                </div>

                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-medium">Vehicle:</span>
                  <div>{drawer.assignedVehicle || "—"}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------- RIGHT-PANE FORMS ------------------------- */
function PickupEditor({ row, onCancel, onSave, onQuickStatus }) {
  const [scheduled, setScheduled] = useState(row?.scheduledDate ? new Date(row.scheduledDate).toISOString().slice(0, 16) : "");
  const [location, setLocation] = useState(row?.pickupLocation || "");

  return (
    <div className="space-y-3">
      <label className="text-sm text-slate-600">Pickup Time</label>
      <input
        type="datetime-local"
        value={scheduled}
        onChange={(e) => setScheduled(e.target.value)}
        className="w-full px-3 py-2 rounded-xl ring-1 ring-slate-200 focus:ring-emerald-300 outline-none"
      />

      <label className="text-sm text-slate-600">Pickup Location</label>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Warehouse Bay 3, Ipil"
        className="w-full px-3 py-2 rounded-xl ring-1 ring-slate-200 focus:ring-emerald-300 outline-none"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onSave({ scheduledDate: scheduled, pickupLocation: location })}
          className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl ring-1 ring-slate-200">Cancel</button>
      </div>

      <div className="pt-3">
        <div className="text-xs text-slate-500 mb-2">Quick status</div>
        <div className="flex flex-wrap gap-2">
          {["pending", "assigned", "in-transit", "completed", "cancelled"].map((s) => (
            <button key={s} onClick={() => onQuickStatus(s)} className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-slate-200 hover:bg-slate-50">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThirdPartyEditor({ row, onCancel, onSave, onQuickStatus }) {
  const [provider, setProvider] = useState(row?.thirdPartyProvider || "");
  return (
    <div className="space-y-3">
      <label className="text-sm text-slate-600">3rd-Party Provider</label>
      <input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Lalamove, Grab, J&T…"
        className="w-full px-3 py-2 rounded-xl ring-1 ring-slate-200 focus:ring-emerald-300 outline-none"
      />

      <div className="flex gap-2">
        <button
          onClick={() => onSave(provider)}
          className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl ring-1 ring-slate-200">Cancel</button>
      </div>

      <div className="pt-3">
        <div className="text-xs text-slate-500 mb-2">Quick status</div>
        <div className="flex flex-wrap gap-2">
          {["pending", "assigned", "in-transit", "completed", "cancelled"].map((s) => (
            <button key={s} onClick={() => onQuickStatus(s)} className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-slate-200 hover:bg-slate-50">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}








