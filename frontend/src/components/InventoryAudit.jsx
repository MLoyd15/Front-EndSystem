import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { VITE_API_BASE} from "../config"

const API = VITE_API_BASE;
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
});

export default function InventoryAudit() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [physicalMap, setPhysicalMap] = useState({}); // id -> number

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
      alert(e?.response?.data?.message || "Failed to load audit list");
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
      alert("Nothing to reconcile.");
      return;
    }
    if (!window.confirm(`Apply ${changed.length} change(s) to system stock?`)) return;

    try {
      const payload = {
        items: changed.map((r) => ({ id: r._id, physical: r.physical })),
      };
      await axios.post(`${API}/products/audit/reconcile`, payload, {
        headers: { ...authHeader(), "Content-Type": "application/json" },
      });
      alert("Reconciled successfully!");
      fetchAudit(); // refresh numbers
    } catch (e) {
      console.error("Reconcile failed:", e);
      alert(e?.response?.data?.message || "Failed to reconcile");
    }
  };

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
    </div>
  );
}
