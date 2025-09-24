// src/components/dashboardDriver.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Navigation, Phone, RefreshCcw, Truck, CheckCircle2, Timer,
  MapPin, Package, User, Weight, ChevronRight, Search, Clock, X,
} from "lucide-react";

/* ----------------------- config & helpers ----------------------- */
const API = "http://localhost:5000/api/delivery";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token")}` });

const when = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const todayStr = () =>
  new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

const STATUS_COLORS = {
  assigned: "bg-amber-100 text-amber-700 ring-amber-200",
  "in-transit": "bg-sky-100 text-sky-700 ring-sky-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  pending: "bg-gray-100 text-gray-700 ring-gray-200",
  cancelled: "bg-rose-100 text-rose-700 ring-rose-200",
};

// unwrap { success, deliveries } → always return []
const unwrap = (res) => (Array.isArray(res?.data?.deliveries) ? res.data.deliveries : []);

/* ------------------------------ UI bits ------------------------------ */
const Pill = ({ tone = "gray", children }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs ring-1 ${tone} whitespace-nowrap`}>{children}</span>
);

const Empty = ({ icon: Icon, title, note }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
    <div className="p-3 rounded-full bg-gray-50">
      <Icon className="w-6 h-6 text-gray-500" />
    </div>
    <p className="font-medium text-gray-700">{title}</p>
    {note && <p className="text-xs text-gray-500 max-w-sm">{note}</p>}
  </div>
);

const Card = ({ children, onClick }) => (
  <motion.div
    layout
    onClick={onClick}
    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md cursor-pointer"
    whileHover={{ y: -2 }}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
  >
    {children}
  </motion.div>
);

function JobCard({ job, onStart, onDeliver, onView }) {
  const tone = STATUS_COLORS[job?.status] || STATUS_COLORS.pending;
  const address = job?.deliveryAddress || job?.dropoff?.address || job?.pickupLocation || "—";
  const name =
    job?.customer?.name ||
    job?.order?.customerName ||
    job?.assignedDriver?.name ||
    "Customer";
  const items = job?.order?.products?.length || job?.order?.items?.length || job?.items?.length || 0;
  const weightKg = job?.weightKg || job?.order?.weightKg || null;
  const eta = job?.eta || job?.order?.eta;

  return (
    <Card onClick={() => onView?.(job)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-50">
            <Package className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800">
                {job?.order?.code || job?._id?.slice(-6).toUpperCase()}
              </p>
              <Pill tone={tone}>{job?.status}</Pill>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {name}
              </span>
              {weightKg ? (
                <span className="flex items-center gap-1">
                  <Weight className="w-4 h-4" />
                  {weightKg} kg
                </span>
              ) : null}
              {items ? (
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {items} item{items > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-2 text-gray-600 text-sm">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{address}</span>
            </div>
            {eta && (
              <div className="mt-1 flex items-center gap-2 text-gray-500 text-xs">
                <Clock className="w-4 h-4" /> ETA {when(eta)}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Navigation className="w-4 h-4" /> Navigate
        </a>
        {job?.customer?.phone && (
          <a
            href={`tel:${job.customer.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="w-4 h-4" /> Call
          </a>
        )}
        {job?.status === "assigned" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart?.(job);
            }}
            className="rounded-xl bg-sky-600 text-white px-3 py-2 text-sm hover:bg-sky-700"
          >
            <Truck className="w-4 h-4 inline mr-1" /> Start Trip
          </button>
        )}
        {job?.status === "in-transit" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeliver?.(job);
            }}
            className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1" /> Mark Delivered
          </button>
        )}
      </div>
    </Card>
  );
}

const DetailSheet = ({ open, job, onClose }) => {
  if (!open || !job) return null;
  const tone = STATUS_COLORS[job?.status] || STATUS_COLORS.gray;
  const address = job?.deliveryAddress || job?.dropoff?.address || job?.pickupLocation || "—";
  const name =
    job?.customer?.name ||
    job?.order?.customerName ||
    job?.assignedDriver?.name ||
    "Customer";
  const items = job?.order?.products || job?.order?.items || job?.items || [];

  return (
    <AnimatePresence>
      <motion.div
        key="sheet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  {job?.order?.code || job?._id?.slice(-6).toUpperCase()}
                </h3>
                <Pill tone={tone}>{job?.status}</Pill>
              </div>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <User className="w-4 h-4" /> {name}
              </p>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {address}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Items</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.length === 0 && <p className="text-sm text-gray-500">No items attached.</p>}
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border p-2">
                  <span className="text-sm text-gray-700 line-clamp-1">
                    {it?.name || it?.product?.name || `Item ${idx + 1}`}
                  </span>
                  <span className="text-sm text-gray-500">x{it?.qty || it?.quantity || 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Navigation className="w-4 h-4" /> Navigate
            </a>
            {job?.customer?.phone && (
              <a
                href={`tel:${job.customer.phone}`}
                className="flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Phone className="w-4 h-4" /> Call customer
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ---------------------------- main component ---------------------------- */
export default function DriverHome() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [inTransit, setInTransit] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [detail, setDetail] = useState(null);

  const fetcher = useCallback(async () => {
    try {
      setError("");

      // show ALL deliveries for each status (server may still restrict by role)
      const [a, t, c] = await Promise.all([
        axios.get(`${API}?status=assigned`,   { headers: auth() }),
        axios.get(`${API}?status=in-transit`, { headers: auth() }),
        axios.get(`${API}?status=completed`,  { headers: auth() }),
      ]);

      setAssigned(unwrap(a));
      setInTransit(unwrap(t));
      setCompleted(unwrap(c));
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e.message || "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetcher();
    const id = setInterval(fetcher, 30000);
    return () => clearInterval(id);
  }, [fetcher]);

  const stats = useMemo(
    () => [
      { label: "Assigned", value: assigned.length, tone: "bg-amber-50 text-amber-700" },
      { label: "In Transit", value: inTransit.length, tone: "bg-sky-50 text-sky-700" },
      { label: "Completed", value: completed.length, tone: "bg-emerald-50 text-emerald-700" },
    ],
    [assigned, inTransit, completed]
  );

  const mutateStatus = async (job, status) => {
    try {
      await axios.put(`${API}/${job._id}`, { status }, { headers: auth() });
      fetcher();
    } catch (e) {
      alert(e?.response?.data?.message || e.message);
    }
  };

  const onStart = (job) => mutateStatus(job, "in-transit");
  const onDeliver = (job) => mutateStatus(job, "completed");

  const filterByQ = (list = []) => {
    const arr = Array.isArray(list) ? list : [];
    if (!q) return arr;
    const rx = new RegExp(q, "i");
    return arr.filter(
      (j) =>
        rx.test(j?.order?.code || "") ||
        rx.test(j?.customer?.name || j?.assignedDriver?.name || "") ||
        rx.test(j?.deliveryAddress || j?.pickupLocation || "")
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Driver Dashboard</h1>
          <p className="text-sm text-gray-500">{todayStr()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl bg-white border px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search job code, driver, or address…"
              className="outline-none text-sm w-56"
            />
          </div>
          <button
            onClick={fetcher}
            className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 border bg-white ${s.tone}`}>
            <p className="text-xs uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Timer className="w-4 h-4" /> Ready to pick up
            </h2>
          </div>
          <div className="space-y-3">
            {loading && <Empty icon={Timer} title="Loading…" />}
            {!loading && filterByQ(assigned).length === 0 && (
              <Empty icon={Timer} title="No assigned jobs" note="Once a dispatcher assigns tasks, they will appear here." />
            )}
            <AnimatePresence>
              {filterByQ(assigned).map((j) => (
                <motion.div
                  key={j._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <JobCard job={j} onStart={onStart} onDeliver={onDeliver} onView={(job) => setDetail(job)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* In transit */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Truck className="w-4 h-4" /> In transit
            </h2>
          </div>
          <div className="space-y-3">
            {loading && <Empty icon={Truck} title="Loading…" />}
            {!loading && filterByQ(inTransit).length === 0 && (
              <Empty icon={Truck} title="No ongoing trips" note="Start a job to move it to in-transit." />
            )}
            <AnimatePresence>
              {filterByQ(inTransit).map((j) => (
                <motion.div
                  key={j._id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <JobCard job={j} onStart={onStart} onDeliver={onDeliver} onView={(job) => setDetail(job)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>
      </div>

      {/* Completed (all) */}
      <section className="mt-6">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Completed deliveries
        </h2>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Empty icon={CheckCircle2} title="Loading…" />
            </div>
          )}
          {!loading && filterByQ(completed).length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Empty icon={CheckCircle2} title="No completed deliveries" note="Completed drops will appear here." />
            </div>
          )}
          {filterByQ(completed).map((j) => (
            <Card key={j._id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">
                      {j?.order?.code || j?._id?.slice(-6).toUpperCase()}
                    </p>
                    <Pill tone={STATUS_COLORS.completed}>completed</Pill>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4" /> {j?.customer?.name || j?.order?.customerName || "Customer"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Delivered {when(j?.deliveredAt || j?.updatedAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-3 text-sm">
          {error}
        </div>
      )}

      <DetailSheet open={!!detail} job={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
