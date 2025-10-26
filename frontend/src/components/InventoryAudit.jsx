import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { VITE_API_BASE} from "../config"

const API = VITE_API_BASE;
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
});

// Confirmation Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, changesCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 ring-2 ring-blue-200 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            ?
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
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Success Modal Component
const SuccessModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <div className="text-emerald-600 text-2xl font-bold">✓</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Success</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Error Modal Component
const ErrorModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <div className="text-red-600 text-2xl font-bold">✕</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Info Modal Component (for "Nothing to reconcile")
const InfoModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="text-blue-600 text-2xl font-bold">ℹ</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Information</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default function InventoryAudit() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [physicalMap, setPhysicalMap] = useState({}); // id -> number
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, changesCount: 0 });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: "" });
  const [infoModal, setInfoModal] = useState({ isOpen: false, message: "" });

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/products/audit`, {
        headers: authHeader(),
      });
      const list = data.items || [];
      setItems(list);
      // initialize physical = system stock
      const init = {};
      for (const p of list) init[p._id] = p.stock ?? 0;
      setPhysicalMap(init);
    } catch (e) {
      console.error("Audit fetch failed:", e);
      setErrorModal({
        isOpen: true,
        message: e?.response?.data?.message || "Failed to load audit list"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const setPhysical = (id, value) => {
    const n = Math.max(0, Number(value) || 0);
    setPhysicalMap((m) => ({ ...m, [id]: n }));
  };

  const adjustPhysical = (id, delta) => {
    setPhysicalMap((m) => {
      const n = Math.max(0, Number(m[id] ?? 0) + delta);
      return { ...m, [id]: n };
    });
  };

  const rows = useMemo(() => {
    return items.map((p) => {
      const physical = Number(physicalMap[p._id] ?? p.stock ?? 0);
      const system = Number(p.stock ?? 0);
      const diff = physical - system;
      return { ...p, physical, system, diff };
    });
  }, [items, physicalMap]);

  const changed = rows.filter((r) => r.diff !== 0);

  const reconcile = async () => {
    if (changed.length === 0) {
      setInfoModal({
        isOpen: true,
        message: "Nothing to reconcile."
      });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      changesCount: changed.length
    });
  };

  const handleConfirmReconcile = async () => {
    try {
      const payload = {
        items: changed.map((r) => ({ id: r._id, physical: r.physical })),
      };
      await axios.post(`${API}/products/audit/reconcile`, payload, {
        headers: { ...authHeader(), "Content-Type": "application/json" },
      });
      setSuccessModal({
        isOpen: true,
        message: "Stock updated successfully!"
      });
      fetchAudit(); // refresh numbers
    } catch (e) {
      console.error("Reconcile failed:", e);
      setErrorModal({
        isOpen: true,
        message: e?.response?.data?.message || "Failed to reconcile"
      });
    }
  };

  // Modal close handlers
  const closeConfirmModal = () => setConfirmModal({ isOpen: false, changesCount: 0 });
  const closeSuccessModal = () => setSuccessModal({ isOpen: false, message: '' });
  const closeErrorModal = () => setErrorModal({ isOpen: false, message: '' });
  const closeInfoModal = () => setInfoModal({ isOpen: false, message: '' });

  return (
    <div className="p-0.5 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-2xl shadow border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">✓</span>
            <h2 className="text-lg font-semibold">Inventory Audit</h2>
          </div>
          <button
            onClick={reconcile}
            disabled={changed.length === 0}
            className={`px-4 py-2 rounded-lg text-white ${changed.length === 0 ? "bg-gray-300" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            Reconcile
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">System</th>
                <th className="px-4 py-3">Physical</th>
                <th className="px-4 py-3">Diff</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                    No products found.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r._id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-gray-500">
                      {r?.category?.categoryName || "-"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.system}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-9 h-9 border rounded-lg"
                        onClick={() => adjustPhysical(r._id, -1)}
                      >
                        –
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="w-24 border rounded-lg px-3 py-2 text-center"
                        value={r.physical}
                        onChange={(e) => setPhysical(r._id, e.target.value)}
                      />
                      <button
                        type="button"
                        className="w-9 h-9 border rounded-lg"
                        onClick={() => adjustPhysical(r._id, +1)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${r.diff === 0 ? "text-gray-500" : r.diff > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {r.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Reconciling will apply the physical counts to system stock.
        </p>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={() => {
          closeConfirmModal();
          handleConfirmReconcile();
        }}
        title="Confirm Reconciliation"
        message={`Apply ${confirmModal.changesCount} change(s) to system stock?`}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={closeSuccessModal}
        message={successModal.message}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        message={errorModal.message}
      />

      <InfoModal
        isOpen={infoModal.isOpen}
        onClose={closeInfoModal}
        message={infoModal.message}
      />
    </div>
  );
}
