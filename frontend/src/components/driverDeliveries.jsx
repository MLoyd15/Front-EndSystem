import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Search, MapPin, Clock, User, MessageSquare, Phone, RefreshCw } from "lucide-react";
import ChatModal from "./chatmodal";       // <- use the ChatModal we created earlier
import ChatPanel from "./chat";       // <- real Socket.IO chat panel
import { VITE_API_BASE} from "../config"

const API = `${VITE_API_BASE}/delivery`
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("pos-token") || ""}` });

/* ---------- Small UI helpers ---------- */
const toneByStatus = (s = "") => {
  const k = String(s).toLowerCase();
  if (k === "in-transit") return { pill: "bg-sky-100 text-sky-700 ring-sky-200", dot: "bg-sky-500" };
  if (k === "assigned")   return { pill: "bg-emerald-100 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
  if (k === "completed")  return { pill: "bg-indigo-100 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" };
  if (k === "pending")    return { pill: "bg-amber-100 text-amber-700 ring-amber-200", dot: "bg-amber-500" };
  if (k === "cancelled")  return { pill: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" };
  return { pill: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" };
};

const Pill = ({ status }) => {
  const t = toneByStatus(status);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ring-1 ${t.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
      {String(status || "-").replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
};

const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");
const last6 = (id = "") => `#${String(id).slice(-6)}`;

export default function DriverDeliveries() {
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]); // Store all data for debugging
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);
  const [debugMode, setDebugMode] = useState(false);

  // Get current driver info from localStorage (should be driver data, not user data)
  const me = (() => { 
    try { 
      // Try to get driver info first, fallback to user if needed
      const driver = JSON.parse(localStorage.getItem("driver") || "{}");
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      
      // Prefer driver data if available, otherwise use user data
      const currentDriver = Object.keys(driver).length > 0 ? driver : user;
      console.log("Current driver info:", currentDriver);
      console.log("Driver from localStorage:", driver);
      console.log("User from localStorage:", user);
      
      return currentDriver;
    } catch { 
      console.log("Failed to parse driver/user from localStorage");
      return {}; 
    } 
  })();

  const fetchDeliveries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Fetching deliveries...");
      
      const params = {};
      if (tab !== "all") params.status = tab;
      if (q.trim()) params.q = q.trim();

      // Add this line
      if (me?._id) params.driverId = me._id;

      const response = await axios.get(`${API_BASE}/delivery`, {
        params,
        headers: authHeaders(),
      });

      console.log("API Response:", response.data);

      // Normalize response shape
      const allDeliveries = Array.isArray(response.data) ? response.data : (response.data?.deliveries || []);
      console.log("All deliveries:", allDeliveries);
      
      setAllRows(allDeliveries); // Store all data for debugging

      if (allDeliveries.length === 0) {
        console.log("No deliveries found in API response");
        setRows([]);
        return;
      }

      // Filter deliveries for this driver with enhanced logging
      const myDeliveries = allDeliveries.filter((d) => {
        const assigned = d?.assignedDriver;
        
        console.log("Checking delivery:", {
          deliveryId: d._id,
          assignedDriver: assigned,
          assignedDriverType: typeof assigned,
          currentDriverId: me?._id,
          currentDriverType: typeof me?._id
        });

        // Handle different assignedDriver formats
        let assignedId;
        if (typeof assigned === "string") {
          assignedId = assigned;
        } else if (typeof assigned === "object" && assigned) {
          assignedId = assigned._id || assigned.id;
        } else {
          assignedId = null;
        }

        const isMatch = String(assignedId || "") === String(me?._id || "");
        console.log("Match result:", { assignedId, currentDriverId: me?._id, isMatch });
        
        return isMatch;
      });

      console.log("Filtered deliveries for driver:", myDeliveries);
      setRows(myDeliveries);

    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch deliveries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [tab, q, me?._id]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    
    return rows.filter((d) => {
      const searchStr = q.toLowerCase();
      return (
        (d?.pickupLocation || "").toLowerCase().includes(searchStr) ||
        (d?.deliveryAddress || "").toLowerCase().includes(searchStr) ||
        (d?.order?._id || "").toLowerCase().includes(searchStr) ||
        (d?.order?.user?.name || "").toLowerCase().includes(searchStr)
      );
    });
  }, [rows, q]);

  const openChat = (orderId) => {
    if (!orderId) {
      alert("No order ID available for chat");
      return;
    }
    setChatOrderId(orderId);
    setChatOpen(true);
  };

  const toggleDebug = () => {
    setDebugMode(!debugMode);
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">My Deliveries</div>
          <div className="text-slate-500 text-sm">
            Signed in as <span className="font-medium">{me?.name || "Driver"}</span>
            {me?._id && <span className="text-xs ml-2">ID: {me._id}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDeliveries}
            disabled={loading}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search address, pickup, order id…"
              className="pl-8 pr-3 py-2 rounded-lg ring-1 ring-slate-200 outline-none w-72"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Debug Toggle */}
      <div className="mb-3">
        <button
          onClick={toggleDebug}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          {debugMode ? "Hide Debug Info" : "Show Debug Info"}
        </button>
      </div>

      {/* Debug Info */}
      {debugMode && (
        <div className="mb-4 p-3 bg-slate-50 border rounded-lg text-xs">
          <div><strong>Driver localStorage key:</strong> {localStorage.getItem("driver") ? "Found" : "Not found"}</div>
          <div><strong>User localStorage key:</strong> {localStorage.getItem("user") ? "Found" : "Not found"}</div>
          <div><strong>Current Driver ID:</strong> {me?._id || "Not found"}</div>
          <div><strong>Current Driver Name:</strong> {me?.name || "Not found"}</div>
          <div><strong>Driver Role/Type:</strong> {me?.role || me?.type || "Not specified"}</div>
          <div><strong>Total Deliveries from API:</strong> {allRows.length}</div>
          <div><strong>My Deliveries:</strong> {rows.length}</div>
          <div><strong>Filtered Deliveries:</strong> {filtered.length}</div>
          
          {allRows.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-slate-600">Show All Deliveries Data</summary>
              <pre className="mt-2 text-[10px] overflow-auto max-h-40 bg-white p-2 rounded border">
                {JSON.stringify(allRows.map(d => ({
                  id: d._id,
                  assignedDriver: d.assignedDriver,
                  assignedDriverType: typeof d.assignedDriver,
                  status: d.status,
                  pickupLocation: d.pickupLocation
                })), null, 2)}
              </pre>
            </details>
          )}
          
          {me?._id && (
            <details className="mt-2">
              <summary className="cursor-pointer text-slate-600">Show Current Driver Data</summary>
              <pre className="mt-2 text-[10px] overflow-auto max-h-40 bg-white p-2 rounded border">
                {JSON.stringify(me, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { k: "all", label: `All (${rows.filter(d => tab === "all" || d?.status === tab).length})` },
          { k: "assigned", label: `Assigned (${rows.filter(d => d?.status === "assigned").length})` },
          { k: "in-transit", label: `In-Transit (${rows.filter(d => d?.status === "in-transit").length})` },
          { k: "completed", label: `Completed (${rows.filter(d => d?.status === "completed").length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded-full text-sm ring-1 ${
              tab === t.k ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-3 text-left font-semibold">Order</th>
              <th className="px-3 py-3 text-left font-semibold">Status</th>
              <th className="px-3 py-3 text-left font-semibold">Pickup</th>
              <th className="px-3 py-3 text-left font-semibold">Drop-off</th>
              <th className="px-3 py-3 text-left font-semibold">Customer</th>
              <th className="px-3 py-3 text-left font-semibold">When</th>
              <th className="px-3 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Loading deliveries…
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-lg">📦</div>
                    <div>
                      {rows.length === 0 
                        ? "No deliveries assigned to you yet" 
                        : q.trim() 
                          ? `No deliveries match "${q}"` 
                          : "No deliveries in this category"
                      }
                    </div>
                    {rows.length === 0 && (
                      <button
                        onClick={fetchDeliveries}
                        className="mt-2 text-emerald-600 hover:text-emerald-700 text-sm"
                      >
                        Refresh to check for new deliveries
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d._id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-3 font-mono font-semibold">{last6(d?.order?._id || d?._id)}</td>
                  <td className="px-3 py-3"><Pill status={d?.status} /></td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="max-w-[150px] truncate">{d?.pickupLocation || "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="max-w-[150px] truncate">{d?.deliveryAddress || "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <User className="h-4 w-4 text-slate-400" />
                      {d?.order?.user?.name || "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4 text-slate-400" />
                      {fmt(d?.scheduledDate || d?.createdAt)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {d?.order?.user?.phone && (
                        <a
                          href={`tel:${d.order.user.phone}`}
                          className="px-2 py-1.5 rounded-md ring-1 ring-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 transition-colors"
                          title={`Call ${d.order.user.name}`}
                        >
                          <Phone className="h-4 w-4" />
                          <span className="hidden sm:inline">Call</span>
                        </a>
                      )}
                      <button
                        onClick={() => openChat(d?.order?._id)}
                        className="px-2 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 transition-colors"
                        title={`Chat with ${d?.order?.user?.name || 'customer'}`}
                        disabled={!d?.order?._id}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span className="hidden sm:inline">Chat</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {!loading && filtered.length > 0 && (
        <div className="mt-3 text-sm text-slate-500 text-center">
          Showing {filtered.length} of {rows.length} deliveries assigned to you
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)}>
        {chatOrderId ? (
          <ChatPanel orderId={chatOrderId} role="driver" onClose={() => setChatOpen(false)} />
        ) : (
          <div className="p-4">No order selected for chat.</div>
        )}
      </ChatModal>
    </div>
  );
}