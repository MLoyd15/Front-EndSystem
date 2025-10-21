// src/components/dashboardDriver.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, RefreshCcw, Truck, CheckCircle2, Timer,
  MapPin, Package, User, Weight, ChevronRight, Search, Clock, X,
  ChevronLeft, Calendar, TrendingUp
} from "lucide-react";
import { VITE_API_BASE } from "../config";

const API = `${VITE_API_BASE}/delivery`;
const auth = () => {
  const t = localStorage.getItem("pos-token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/* ----------------------------- Helpers ----------------------------- */
const when = (iso) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const todayStr = () =>
  new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });

const STATUS_COLORS = {
  assigned: "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 ring-1 ring-amber-200",
  "in-transit": "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 ring-1 ring-sky-200",
  completed: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-1 ring-emerald-200",
  pending: "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 ring-1 ring-gray-200",
  cancelled: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-1 ring-rose-200",
};

const unwrap = (res) => (Array.isArray(res?.data) ? res.data : (res?.data?.deliveries || []));

/* ------------------------------ UI Components ------------------------------ */
const Pill = ({ tone = "gray", children }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-medium ${tone} whitespace-nowrap`}>{children}</span>
);

const Empty = ({ icon: Icon, title, note }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
    <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100">
      <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <div>
      <p className="font-semibold text-gray-700 text-lg">{title}</p>
      {note && <p className="text-sm text-gray-500 max-w-sm mt-1">{note}</p>}
    </div>
  </div>
);

const Card = ({ children, onClick }) => (
  <motion.div
    layout
    onClick={onClick}
    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg cursor-pointer transition-all duration-200"
    whileHover={{ y: -4, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 24 }}
  >
    {children}
  </motion.div>
);

function JobCard({ job, onStart, onDeliver, onView }) {
  const tone = STATUS_COLORS[job?.status] || STATUS_COLORS.pending;
  const address = job?.deliveryAddress || job?.dropoff?.address || job?.pickupLocation || "—";
  const name = job?.customer?.name || job?.order?.customerName || job?.assignedDriver?.name || "Customer";
  const items = job?.order?.products?.length || job?.order?.items?.length || job?.items?.length || 0;
  const weightKg = job?.weightKg || job?.order?.weightKg || null;
  const eta = job?.eta || job?.order?.eta;

  return (
    <Card onClick={() => onView?.(job)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 ring-1 ring-emerald-200">
            <Package className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-lg">
                {job?.order?.code || job?._id?.slice(-6).toUpperCase()}
              </p>
              <Pill tone={tone}>{job?.status}</Pill>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{name}</span>
              </span>
              {weightKg ? (
                <span className="flex items-center gap-1.5">
                  <Weight className="w-4 h-4 text-gray-400" />
                  <span>{weightKg} kg</span>
                </span>
              ) : null}
              {items ? (
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span>{items} item{items > 1 ? "s" : ""}</span>
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-start gap-2 text-gray-700">
              <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
              <span className="line-clamp-2 text-sm">{address}</span>
            </div>
            {eta && (
              <div className="mt-2 flex items-center gap-2 text-gray-500 text-xs bg-gray-50 rounded-lg px-2 py-1 w-fit">
                <Clock className="w-3.5 h-3.5" /> ETA {when(eta)}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-2 flex-wrap">
        {job?.customer?.phone && (
          <a
            href={`tel:${job.customer.phone}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:from-sky-700 hover:to-blue-700 transition-all shadow-sm"
          >
            <Truck className="w-4 h-4" /> Start Trip
          </button>
        )}
        {job?.status === "in-transit" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeliver?.(job);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2.5 text-sm font-medium hover:from-emerald-700 hover:to-green-700 transition-all shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Delivered
          </button>
        )}
      </div>
    </Card>
  );
}

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1));

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      
      {visiblePages[0] > 1 && (
        <>
          <button
            onClick={() => onPageChange(1)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            1
          </button>
          {visiblePages[0] > 2 && <span className="text-gray-400">...</span>}
        </>
      )}
      
      {visiblePages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            currentPage === page
              ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-sm"
              : "border border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          {page}
        </button>
      ))}
      
      {visiblePages[visiblePages.length - 1] < totalPages && (
        <>
          {visiblePages[visiblePages.length - 1] < totalPages - 1 && <span className="text-gray-400">...</span>}
          <button
            onClick={() => onPageChange(totalPages)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const DetailSheet = ({ open, job, onClose }) => {
  if (!open || !job) return null;
  const tone = STATUS_COLORS[job?.status] || STATUS_COLORS.gray;
  const address = job?.deliveryAddress || job?.dropoff?.address || job?.pickupLocation || "—";
  const name = job?.order?.user?.name || job?.order?.name || job?.assignedDriver?.name || "Customer";
  const items = job?.order?.products || job?.order?.items || job?.items || [];

  return (
    <AnimatePresence>
      <motion.div
        key="sheet"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
          className="absolute inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {job?.order?.code || job?._id?.slice(-6).toUpperCase()}
                </h3>
                <Pill tone={tone}>{job?.status}</Pill>
              </div>
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                <User className="w-4 h-4" /> {name}
              </p>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {address}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">Order Items</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.length === 0 && <p className="text-sm text-gray-500">No items attached.</p>}
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-gray-200 p-3 bg-gray-50">
                  <span className="text-sm text-gray-700 line-clamp-1 font-medium">
                    {it?.name || it?.product?.name || `Item ${idx + 1}`}
                  </span>
                  <span className="text-sm text-gray-600 ml-2">×{it?.qty || it?.quantity || 1}</span>
                </div>
              ))}
            </div>
          </div>

          {job?.customer?.phone && (
            <div className="mt-6">
              <a
                href={`tel:${job.customer.phone}`}
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Phone className="w-4 h-4" /> Call customer
              </a>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ---------------------------- Main Component ---------------------------- */
export default function DriverHome() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [inTransit, setInTransit] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [detail, setDetail] = useState(null);
  
  // Pagination states
  const [assignedPage, setAssignedPage] = useState(1);
  const [transitPage, setTransitPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  const fetcher = useCallback(async () => {
    try {
      setError("");
      const [a, t, c] = await Promise.all([
        axios.get(API, { headers: auth(), params: { status: "assigned" } }),
        axios.get(API, { headers: auth(), params: { status: "in-transit" } }),
        axios.get(API, { headers: auth(), params: { status: "completed" } }),
      ]);

      // Sort by newest first (createdAt or updatedAt)
      const sortByNewest = (arr) => arr.sort((a, b) => 
        new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
      );

      setAssigned(sortByNewest(unwrap(a)));
      setInTransit(sortByNewest(unwrap(t)));
      setCompleted(sortByNewest(unwrap(c)));
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
      { label: "Assigned", value: assigned.length, tone: "from-amber-500 to-orange-500", icon: Timer },
      { label: "In Transit", value: inTransit.length, tone: "from-sky-500 to-blue-500", icon: Truck },
      { label: "Completed", value: completed.length, tone: "from-emerald-500 to-green-500", icon: CheckCircle2 },
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

  // Paginate function
  const paginate = (items, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };

  const filteredAssigned = filterByQ(assigned);
  const filteredTransit = filterByQ(inTransit);
  const filteredCompleted = filterByQ(completed);

  const paginatedAssigned = paginate(filteredAssigned, assignedPage);
  const paginatedTransit = paginate(filteredTransit, transitPage);
  const paginatedCompleted = paginate(filteredCompleted, completedPage);

  const assignedTotalPages = Math.ceil(filteredAssigned.length / ITEMS_PER_PAGE);
  const transitTotalPages = Math.ceil(filteredTransit.length / ITEMS_PER_PAGE);
  const completedTotalPages = Math.ceil(filteredCompleted.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Driver Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {todayStr()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-4 py-2.5 shadow-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search orders..."
                className="outline-none text-sm w-48 sm:w-64"
              />
            </div>
            <button
              onClick={fetcher}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              title="Refresh"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ y: -4 }}
              className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${s.tone}`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Assigned */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-600" /> Ready to pick up
                <span className="text-sm font-normal text-gray-500">({filteredAssigned.length})</span>
              </h2>
            </div>
            <div className="space-y-4">
              {loading && <Empty icon={Timer} title="Loading..." />}
              {!loading && filteredAssigned.length === 0 && (
                <Empty icon={Timer} title="No assigned jobs" note="Once a dispatcher assigns tasks, they will appear here." />
              )}
              <AnimatePresence mode="popLayout">
                {paginatedAssigned.map((j) => (
                  <motion.div
                    key={j._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <JobCard job={j} onStart={onStart} onDeliver={onDeliver} onView={(job) => setDetail(job)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <Pagination 
                currentPage={assignedPage} 
                totalPages={assignedTotalPages} 
                onPageChange={setAssignedPage} 
              />
            </div>
          </section>

          {/* In Transit */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-600" /> In transit
                <span className="text-sm font-normal text-gray-500">({filteredTransit.length})</span>
              </h2>
            </div>
            <div className="space-y-4">
              {loading && <Empty icon={Truck} title="Loading..." />}
              {!loading && filteredTransit.length === 0 && (
                <Empty icon={Truck} title="No ongoing trips" note="Start a job to move it to in-transit." />
              )}
              <AnimatePresence mode="popLayout">
                {paginatedTransit.map((j) => (
                  <motion.div
                    key={j._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <JobCard job={j} onStart={onStart} onDeliver={onDeliver} onView={(job) => setDetail(job)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <Pagination 
                currentPage={transitPage} 
                totalPages={transitTotalPages} 
                onPageChange={setTransitPage} 
              />
            </div>
          </section>
        </div>

        {/* Completed */}
        <section>
          <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Completed deliveries
            <span className="text-sm font-normal text-gray-500">({filteredCompleted.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Empty icon={CheckCircle2} title="Loading..." />
              </div>
            )}
            {!loading && filteredCompleted.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Empty icon={CheckCircle2} title="No completed deliveries" note="Completed drops will appear here." />
              </div>
            )}
            {paginatedCompleted.map((j) => (
              <Card key={j._id} onClick={() => setDetail(j)}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">
                        {j?.order?.code || j?._id?.slice(-6).toUpperCase()}
                      </p>
                      <Pill tone={STATUS_COLORS.completed}>completed</Pill>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> {j?.customer?.name || j?.order?.customerName || "Customer"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Delivered {when(j?.deliveredAt || j?.updatedAt)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Pagination 
            currentPage={completedPage} 
            totalPages={completedTotalPages} 
            onPageChange={setCompletedPage} 
          />
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
            {error}
          </div>
        )}

        <DetailSheet open={!!detail} job={detail} onClose={() => setDetail(null)} />
      </div>
    </div>
  );
}