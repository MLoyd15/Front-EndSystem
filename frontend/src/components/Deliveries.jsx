import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Bike, Search, Filter, Clock, MapPin, User, Weight,
  ChevronRight, X, CheckCircle2, ShoppingCart, Phone, CheckCircle, XCircle,
  Truck, RefreshCcw
} from "lucide-react";
import { VITE_API_BASE } from "../config";
import LalamoveIntegration from "../components/LalamoveIntegration";

/* ----------------------------- API ----------------------------- */
const API = `${VITE_API_BASE}/delivery`;
const auth = () => {
  const t = localStorage.getItem("pos-token");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

/* ---------------------------- HELPERS -------------------------- */
const chip = (color, text) => {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    gray: "bg-gray-100 text-gray-700 ring-gray-200",
    red: "bg-red-100 text-red-700 ring-red-200",
    pink: "bg-pink-100 text-pink-700 ring-pink-200",
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${colors[color]}`}>{text}</span>;
};

// ✅ UPDATED: Custom status labels for pickup deliveries
const statusPill = (status, deliveryType = null) => {
  const map = {
    pending: ["gray", "Pending"],
    assigned: ["sky", "Assigned"],
    "in-transit": ["amber", "In transit"],
    completed: ["green", "Completed"],
    cancelled: ["red", "Cancelled"],
    
    // Lalamove statuses
    "ASSIGNING_DRIVER": ["amber", "Finding Driver"],
    "ON_GOING": ["sky", "On Going"],
    "PICKED_UP": ["amber", "Picked Up"],
    "COMPLETED": ["green", "Delivered"],
    "CANCELLED": ["red", "Cancelled"],
    "EXPIRED": ["gray", "Expired"],
  };
  
  // ✅ Override labels for pickup deliveries only
  if (deliveryType === "pickup") {
    const pickupMap = {
      assigned: ["sky", "Preparing"],
      "in-transit": ["amber", "Ready to Pickup"],
    };
    if (pickupMap[status]) {
      const [c, label] = pickupMap[status];
      return chip(c, label);
    }
  }
  
  const [c, label] = map[status] || ["gray", status || "Pending"];
  return chip(c, label);
};

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const last6 = (id = "") => `#${String(id).slice(-6)}`;

const driverLabel = (row) => row?.assignedDriver?.name || row?.assignedDriver || "";
const vehicleLabel = (row) => row?.assignedVehicle?.plate || row?.assignedVehicle || "";
const vehiclePill = (row) => {
  const label = vehicleLabel(row);
  return label ? chip("sky", label) : null;
};

const lalamoveBadge = (row) => {
  if (row?.lalamove?.orderId) {
    return chip("pink", "Lalamove");
  }
  return null;
};

const PAGE_SIZE = 5;

export default function Deliveries() {
  const [tab, setTab] = useState("pickup");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(null);
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(null);
  
  const [lalamoveModal, setLalamoveModal] = useState(false);
  const [lalamoveDelivery, setLalamoveDelivery] = useState(null);

  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (query) params.q = query.trim();

      const { data } = await axios.get(API, { headers: auth(), params });
      const deliveries = Array.isArray(data) ? data : (data?.deliveries || []);
      const sortedDeliveries = deliveries.sort(
        (a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0)
      );
      setRows(sortedDeliveries);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryDetails = async (deliveryId) => {
    setDrawerLoading(true);
    try {
      const { data } = await axios.get(`${API}/${deliveryId}`, { headers: auth() });
      setDrawerDetails(data);
    } catch (e) {
      console.warn("Details endpoint unavailable:", e?.response?.status);
      setDrawerDetails(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab, status]);
  useEffect(() => { setPage(1); }, [tab, status, query]);

  const filtered = useMemo(() => {
    const typeKey = String(tab).toLowerCase();
    let byTab = [];

    if (tab === "completed") {
      byTab = rows.filter((r) => r.status === "completed");
    } else if (tab === "cancelled") {
      byTab = rows.filter((r) => r.status === "cancelled");
    } else {
      byTab = rows.filter(
        (r) =>
          String(r.type || "").toLowerCase() === typeKey &&
          !["completed", "cancelled"].includes(r.status)
      );
    }

    if (!query) return byTab;

    const q = query.toLowerCase();
    return byTab.filter((r) => {
      const addr = String(r.deliveryAddress || "").toLowerCase();
      const pick = String(r.pickupLocation || "").toLowerCase();
      const prov = String(r.thirdPartyProvider || "").toLowerCase();
      const drv = String(driverLabel(r)).toLowerCase();
      const veh = String(vehicleLabel(r)).toLowerCase();
      const id = String(r._id || "").toLowerCase();
      const orderId = String(r.orderId || "").toLowerCase();
      const lalamoveId = String(r.lalamove?.orderId || "").toLowerCase();
      return [addr, pick, prov, drv, veh, id, orderId, lalamoveId].some((t) => t.includes(q));
    });
  }, [rows, query, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const showingFrom = filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const showingTo = Math.min(page * PAGE_SIZE, filtered.length);

  const headerTitle =
    tab === "pickup" ? "Customer Pickups" :
    tab === "in-house" ? "In-house Deliveries" :
    tab === "third-party" ? "Third-party Deliveries" :
    tab === "completed" ? "Completed Deliveries" :
    "Cancelled Deliveries";

  const tabColors = {
    pickup: "bg-emerald-600",
    "in-house": "bg-amber-600",
    "third-party": "bg-sky-600",
    completed: "bg-green-600",
    cancelled: "bg-red-600",
  };

  // ✅ UPDATED: Auto-fill pickup location when updating status
  const onQuickStatus = async (id, st, isPickup = false) => {
    if (st === "cancelled") {
      const ok = window.confirm("Cancel this delivery?");
      if (!ok) return;
    }
    try {
      const updateData = { status: st };
      
      // ✅ Auto-fill pickup location for pickup deliveries when status is updated
      if (isPickup && st !== "cancelled") {
        updateData.pickupLocation = "Poblacion 1, Moncada Tarlac, Philippines";
      }
      
      await axios.put(`${API}/${id}`, updateData, { headers: auth() });
      load();
    } catch (e) {
      console.error('Error updating status:', e?.response?.data || e.message);
    }
  };

  // ✅ UPDATED: Auto-fill pickup location when saving
  const onSavePickup = async (id, values) => {
    try {
      const body = {};
      if ("scheduledDate" in values) body.scheduledDate = values.scheduledDate ? new Date(values.scheduledDate) : null;
      if ("pickupLocation" in values) body.pickupLocation = values.pickupLocation;
      
      // ✅ If pickup location is empty, auto-fill with default address
      if (!values.pickupLocation || values.pickupLocation.trim() === "") {
        body.pickupLocation = "Poblacion 1, Moncada Tarlac, Philippines";
      }
      
      await axios.put(`${API}/${id}`, body, { headers: auth() });
      setEditing(null);
      load();
    } catch (e) {
      console.error('Error saving pickup:', e?.response?.data || e.message);
    }
  };

  const onSaveThirdParty = async (id, provider) => {
    try {
      await axios.put(`${API}/${id}`, { thirdPartyProvider: provider }, { headers: auth() });
      setEditing(null);
      load();
    } catch (e) {
      console.error('Error saving third party:', e?.response?.data || e.message);
    }
  };

  const onSaveInHouse = async (id, { driverId, vehicleId }) => {
    try {
      await axios.put(`${API}/${id}/assign`, { driverId, vehicleId }, { headers: auth() });
      setEditing(null);
      load();
    } catch (e) {
      console.error('Error assigning in-house:', e?.response?.data || e.message);
    }
  };

  const openLalamove = (delivery) => {
    setLalamoveDelivery(delivery);
    setLalamoveModal(true);
    setEditing(null);
  };

  const handleDrawerOpen = (delivery) => {
    setDrawer(delivery);
    setDrawerDetails(null);
    loadDeliveryDetails(delivery._id);
  };

  const getLocationDisplay = (delivery, tab) => {
    if (tab === "pickup") return delivery.pickupLocation || "Set pickup location";
    return delivery.deliveryAddress || "Set delivery address";
  };

  const syncLalamoveStatus = async (deliveryId, lalamoveOrderId) => {
    setSyncing(deliveryId);
    try {
      const response = await axios.get(
        `${VITE_API_BASE}/lalamove/order/${lalamoveOrderId}`,
        { headers: auth() }
      );
      
      if (response.data.success) {
        const lalamoveData = response.data.data;
        const lalamoveStatus = lalamoveData.status;
        const systemStatus = mapLalamoveStatus(lalamoveStatus);
        
        const updatePayload = {
          status: systemStatus,
          'lalamove.status': lalamoveStatus,
        };
        
        if (lalamoveData.driver || lalamoveData.driverId) {
          updatePayload['lalamove.driver'] = {
            name: lalamoveData.driver?.name || lalamoveData.driverName || '',
            phone: lalamoveData.driver?.phone || lalamoveData.driverPhone || '',
            plateNumber: lalamoveData.driver?.plateNumber || '',
            photo: lalamoveData.driver?.photo || ''
          };
        }
        
        if (systemStatus === 'completed') {
          updatePayload.deliveredAt = new Date().toISOString();
        }
        
        await axios.put(
          `${API}/${deliveryId}`,
          updatePayload,
          { headers: auth() }
        );
        
        if (systemStatus === 'completed') {
          alert(`✅ Delivery completed! Moving to Completed tab.`);
        } else {
          alert(`Status synced successfully!`);
        }
        
        load();
      } else {
        throw new Error(response.data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Failed to sync Lalamove status:', error);
      alert('Failed to sync status from Lalamove. Please try again.');
    } finally {
      setSyncing(null);
    }
  };

  const mapLalamoveStatus = (lalamoveStatus) => {
    const statusMap = {
      'ASSIGNING_DRIVER': 'assigned',
      'ON_GOING': 'in-transit',
      'PICKED_UP': 'in-transit',
      'COMPLETED': 'completed',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled'
    };
    return statusMap[lalamoveStatus] || 'pending';
  };

  const renderSyncButton = (delivery) => {
    if (!delivery.lalamove?.orderId) return null;
    
    const isSyncing = syncing === delivery._id;
    
    return (
      <button
        onClick={() => syncLalamoveStatus(delivery._id, delivery.lalamove.orderId)}
        disabled={isSyncing}
        className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-pink-300 text-pink-700 hover:bg-pink-50 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sync Lalamove Status"
      >
        <RefreshCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync'}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-emerald-600" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Delivery Management</h1>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: "pickup", label: "Pickup", Icon: Package },
            { key: "in-house", label: "In-house", Icon: Package },
            { key: "third-party", label: "3rd-Party", Icon: Bike },
            { key: "completed", label: "Completed", Icon: CheckCircle },
            { key: "cancelled", label: "Cancelled", Icon: XCircle },
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
                placeholder="Search address, pickup location, provider, driver, vehicle, order id…"
                className="outline-none bg-transparent flex-1 text-sm"
              />
            </div>

            {!["completed", "cancelled"].includes(tab) && (
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
            )}

            <button
              onClick={load}
              className="bg-white hover:bg-slate-50 transition px-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm inline-flex items-center gap-2"
            >
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-2 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-100 p-4">
              {loading ? (
                <div className="p-6 text-slate-500">Loading…</div>
              ) : (
                <>
                  <div className="space-y-3">
                    <AnimatePresence>
                      {paged.map((d) => (
                        <motion.div
                          key={d._id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="p-4 rounded-2xl ring-1 ring-slate-200 bg-white hover:shadow-lg transition"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 min-w-[8rem]">
                              <span className="font-semibold text-slate-800">
                                {last6(d.order?._id || d.order || d._id)}
                              </span>
                              {/* ✅ Pass delivery type to statusPill */}
                              {d.lalamove?.orderId ? (
                                <>
                                  {statusPill(d.lalamove.status || d.status)}
                                  {lalamoveBadge(d)}
                                </>
                              ) : (
                                statusPill(d.status, d.type)
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-slate-600 min-w-[13rem]">
                              <User className="w-4 h-4" />
                              <span className="truncate">
                                {d.thirdPartyProvider || driverLabel(d) || "—"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-600 min-w-[14rem]">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">
                                {getLocationDisplay(d, tab)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4" />
                              <span>{fmtDateTime(d.scheduledDate)}</span>
                            </div>

                            <div className="flex items-center gap-2 text-slate-600">
                              <Weight className="w-4 h-4" />
                              <span>{d.order?.totalWeightKg || d.weight || 0} kg</span>
                            </div>

                            <div className="ml-auto flex items-center gap-2">
                              {vehiclePill(d)}
                              {renderSyncButton(d)}
                              
                              <button
                                onClick={() => handleDrawerOpen(d)}
                                className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-slate-200 hover:bg-slate-50 inline-flex items-center gap-2"
                              >
                                Details <ChevronRight className="w-4 h-4" />
                              </button>
                              
                              {!["completed", "cancelled"].includes(d.status) && (
                                <button
                                  onClick={() => setEditing(d)}
                                  className="px-3 py-1.5 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Manage
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="text-slate-600">
                      Showing <span className="font-medium text-slate-800">{showingFrom || 0}</span>
                      {"–"}
                      <span className="font-medium text-slate-800">{showingTo || 0}</span> of{" "}
                      <span className="font-medium text-slate-800">{filtered.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className={`px-3 py-1.5 rounded-xl ring-1 transition ${
                          page <= 1
                            ? "ring-slate-100 text-slate-300 cursor-not-allowed"
                            : "ring-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Prev
                      </button>
                      <span className="px-2 text-slate-600">Page {page} of {totalPages}</span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className={`px-3 py-1.5 rounded-xl ring-1 transition ${
                          page >= totalPages
                            ? "ring-slate-100 text-slate-300 cursor-not-allowed"
                            : "ring-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {["completed", "cancelled"].includes(tab) ? (
              <CompletedCancelledSummary deliveries={filtered} tab={tab} />
            ) : (
              <div
                className={`rounded-3xl shadow-xl ring-1 p-5 
                  ${tab === "pickup" ? "bg-emerald-50 ring-emerald-200" : ""}
                  ${tab === "in-house" ? "bg-amber-50 ring-amber-200": ""}
                  ${tab === "third-party" ? "bg-sky-100 ring-sky-200" : ""}`}
              >
                <h3 className="font-semibold mb-4 text-black">
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
                    onQuickStatus={(st) => onQuickStatus(editing._id, st, true)}
                  />
                ) : tab === "in-house" ? (
                  <InHouseEditor
                    row={editing}
                    onCancel={() => setEditing(null)}
                    onAssign={(payload) => onSaveInHouse(editing._id, payload)}
                    onQuickStatus={(st) => onQuickStatus(editing._id, st)}
                  />
                ) : (
                  <ThirdPartyEditor
                    row={editing}
                    onCancel={() => setEditing(null)}
                    onSave={(provider) => onSaveThirdParty(editing._id, provider)}
                    onQuickStatus={(st) => onQuickStatus(editing._id, st)}
                    onOpenLalamove={() => openLalamove(editing)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawer for delivery details */}
      <AnimatePresence>
        {drawer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setDrawer(null)}
          >
            <motion.div
              initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl ring-1 ring-slate-200 p-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800">
                  Order {last6(drawer.order?._id || drawer.order || drawer._id)}
                </h3>
                <button onClick={() => setDrawer(null)} className="p-2 rounded-xl hover:bg-slate-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-slate-500">Loading order details...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Order Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Order ID:</span>
                        <span className="font-medium">{last6(drawer.order?._id || drawer.order || drawer._id)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Delivery Type:</span>
                        <span className="font-medium capitalize">{drawer.type || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Status:</span>
                        <div>
                          {/* ✅ Pass delivery type to statusPill in drawer */}
                          {drawer.lalamove?.orderId 
                            ? statusPill(drawer.lalamove.status || drawer.status)
                            : statusPill(drawer.status, drawer.type)
                          }
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Weight:</span>
                        <span className="font-medium">{drawer.order?.totalWeightKg || drawer.weight || 0} kg</span>
                      </div>
                    </div>
                  </div>

                  {(drawerDetails?.order?.user || drawer?.order?.user) && (
                    <div className="bg-slate-50 rounded-xl p-4">
                      <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Customer Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Name:</span>
                          <span className="font-medium">{(drawerDetails?.order?.user || drawer?.order?.user)?.name || "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Email:</span>
                          <span className="font-medium">{(drawerDetails?.order?.user || drawer?.order?.user)?.email || "—"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-slate-600 block mb-1">Pickup Location:</span>
                        <span className="font-medium">{drawer.pickupLocation || "—"}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block mb-1">Delivery Address:</span>
                        <span className="font-medium">{drawer.deliveryAddress || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Scheduled Time:</span>
                        <span className="font-medium">{fmtDateTime(drawer.scheduledDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Assignment Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      {drawer.thirdPartyProvider ? (
                        <div className="flex justify-between">
                          <span className="text-slate-600">3rd Party Provider:</span>
                          <span className="font-medium">{drawer.thirdPartyProvider}</span>
                        </div>
                      ) : drawer.type === "pickup" ? (
                        <div className="text-center text-slate-500 py-2">
                          No assignment needed for pickup orders
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Driver:</span>
                            <span className="font-medium">{driverLabel(drawer) || "Not assigned"}</span>
                          </div>
                          {drawer.assignedDriver?.phone && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Driver Phone:</span>
                              <span className="font-medium flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {drawer.assignedDriver.phone}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-600">Vehicle:</span>
                            <span className="font-medium">{vehicleLabel(drawer) || "Not assigned"}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lalamove Modal */}
      {lalamoveModal && lalamoveDelivery && (
        <LalamoveIntegration
          delivery={lalamoveDelivery}
          onClose={() => {
            setLalamoveModal(false);
            setLalamoveDelivery(null);
          }}
          onSuccess={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

// ✅ PICKUP EDITOR with custom status buttons
function PickupEditor({ row, onCancel, onSave, onQuickStatus }) {
  const [scheduled, setScheduled] = useState(
    row?.scheduledDate ? new Date(row.scheduledDate).toISOString().slice(0, 16) : ""
  );
  const [location, setLocation] = useState(
    row?.pickupLocation || "Poblacion 1, Moncada Tarlac, Philippines"
  );

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
        placeholder="Poblacion 1, Moncada Tarlac, Philippines"
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

      {/* ✅ Custom status buttons for pickup */}
      <div className="pt-3">
        <div className="text-xs text-slate-500 mb-2">Quick status</div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => onQuickStatus("assigned")} 
            className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-sky-300 text-sky-700 hover:bg-sky-50"
          >
            Preparing
          </button>
          <button 
            onClick={() => onQuickStatus("in-transit")} 
            className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-amber-300 text-amber-700 hover:bg-amber-50"
          >
            Ready to Pickup
          </button>
          <button 
            onClick={() => onQuickStatus("completed")} 
            className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-green-300 text-green-700 hover:bg-green-50"
          >
            Completed
          </button>
          <button 
            onClick={() => onQuickStatus("cancelled")} 
            className="px-3 py-1.5 text-sm rounded-xl ring-1 ring-red-300 text-red-700 hover:bg-red-50"
          >
            Cancelled
          </button>
        </div>
      </div>
    </div>
  );
}

// Other editor components remain the same
function CompletedCancelledSummary({ deliveries, tab }) {
  const bgColor = tab === "completed" ? "bg-green-50 ring-green-200" : "bg-red-50 ring-red-200";
  const iconColor = tab === "completed" ? "text-green-600" : "text-red-600";
  const Icon = tab === "completed" ? CheckCircle : XCircle;

  return (
    <div className={`rounded-3xl shadow-xl ring-1 p-5 ${bgColor}`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h3 className="font-semibold text-black capitalize">{tab} Deliveries</h3>
      </div>
      <div className="bg-white rounded-xl p-4">
        <div className="text-2xl font-bold text-slate-800">{deliveries.length}</div>
        <div className="text-sm text-slate-600">Total {tab}</div>
      </div>
    </div>
  );
}

function ThirdPartyEditor({ row, onCancel, onSave, onQuickStatus, onOpenLalamove }) {
  const [provider, setProvider] = useState(row?.thirdPartyProvider || "");
  
  return (
    <div className="space-y-3">
      <label className="text-sm text-slate-600">3rd-Party Provider</label>
      
      <button
        type="button"
        onClick={onOpenLalamove}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-500 text-white hover:from-pink-600 hover:to-red-600 inline-flex items-center justify-center gap-2 font-medium"
      >
        <Truck className="w-4 h-4"
        />
        Book with Lalamove
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-xs text-slate-500">OR</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>

      <input
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        placeholder="Grab, J&T, or other provider..."
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

      <div className="pt-2">
        <div className="text-xs text-slate-500 mb-2">Quick action</div>
        <button
          onClick={() => onQuickStatus("cancelled")}
          className="w-full px-4 py-2 rounded-xl ring-1 ring-rose-300 text-rose-700 hover:bg-rose-50 active:bg-rose-100 inline-flex items-center justify-center gap-2"
        >
          <XCircle className="w-4 h-4" />
          Cancel delivery
        </button>
      </div>
    </div>
  );
}

function InHouseEditor({ row, onCancel, onAssign, onQuickStatus }) {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverId, setDriverId] = useState(row?.assignedDriver?._id || "");
  const [vehicleId, setVehicleId] = useState(row?.assignedVehicle?._id || "");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        setLoading(true);
        // Fetch drivers from admin endpoint and vehicles from resources endpoint
        const [driversResponse, vehiclesResponse] = await Promise.all([
          axios.get(`${VITE_API_BASE}/admin/drivers`, { headers: auth() }),
          axios.get(`${API}/resources/all`, { headers: auth() })
        ]);
        if (!live) return;
        setDrivers(driversResponse.data?.drivers || []);
        setVehicles(vehiclesResponse.data?.vehicles || []);
        setErr("");
      } catch (e) {
        console.error("Failed to load drivers/vehicles", e?.response?.status, e?.response?.data);
        setErr("Failed to load drivers/vehicles");
        setDrivers([]);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [row?._id]);

  const save = async () => {
    setErr("");
    await onAssign({ driverId, vehicleId });
  };

  const ChoiceItem = ({ active, onClick, leftIcon, title, rightNote }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl ring-1 transition
        ${active ? "bg-emerald-50 ring-emerald-300" : "bg-white ring-slate-200 hover:bg-slate-50"}`}
    >
      <span className="inline-flex items-center gap-3 text-slate-800">
        {leftIcon}
        <span className="font-medium">{title}</span>
      </span>
      {rightNote && <span className="text-xs text-slate-500">{rightNote}</span>}
    </button>
  );

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : (
        <>
          <div>
            <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <User className="w-4 h-4" />
              Driver
            </div>
            <div className="space-y-2">
              {drivers.map((d) => (
                <ChoiceItem
                  key={d._id}
                  active={driverId === d._id}
                  onClick={() => setDriverId(d._id)}
                  leftIcon={<User className="w-4 h-4 text-emerald-600" />}
                  title={d.name}
                  rightNote={d.phone}
                />
              ))}
              {!drivers.length && (
                <div className="text-xs text-slate-500 p-3 text-center bg-slate-50 rounded-xl">No drivers available</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
              <Bike className="w-4 h-4" />
              Vehicle
            </div>
            <div className="space-y-2">
              {vehicles.map((v) => (
                <ChoiceItem
                  key={v._id}
                  active={vehicleId === v._id}
                  onClick={() => setVehicleId(v._id)}
                  leftIcon={<Bike className="w-4 h-4 text-emerald-600" />}
                  title={v.plate}
                  rightNote={`Capacity ${v.capacityKg?.toLocaleString() || 0} kg`}
                />
              ))}
              {!vehicles.length && (
                <div className="text-xs text-slate-500 p-3 text-center bg-slate-50 rounded-xl">No vehicles available</div>
              )}
            </div>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!driverId || !vehicleId}
              className={`flex-1 px-4 py-2 rounded-xl text-white inline-flex items-center justify-center gap-2
                ${driverId && vehicleId ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-300 cursor-not-allowed"}`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Assignment
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-xl ring-1 ring-slate-200">
              Cancel
            </button>
          </div>

          <div className="pt-2">
            <div className="text-xs text-slate-500 mb-2">Quick action</div>
            <button
              onClick={() => onQuickStatus("cancelled")}
              className="w-full px-4 py-2 rounded-xl ring-1 ring-rose-300 text-rose-700 hover:bg-rose-50 active:bg-rose-100 inline-flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel delivery
            </button>
          </div>
        </>
      )}
    </div>
  );
}