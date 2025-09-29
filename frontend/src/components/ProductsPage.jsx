import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import InventoryAudit from "./InventoryAudit";
import KpiCard from "../components/kpicard";
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config";

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
});



// data-URI tiny placeholder (no network call)
const DATA_PLACEHOLDER_48 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>
       <rect width='100%' height='100%' fill='#e5e7eb'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             font-family='sans-serif' font-size='10' fill='#9ca3af'>no image</text>
     </svg>`
  );

// helper: turn comma/newline-separated text into array of URLs
const toUrlArray = (text) =>
  String(text || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

// helper: first image URL (tolerate string or { url })
const firstImage = (p) => {
  const x = p?.images?.[0];
  return typeof x === "string" ? x : x?.url || null;
};

export default function ProductsPage() {
  // list & filters
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // categories
  const [categories, setCategories] = useState([]);

  // add/edit product modal
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [catForForm, setCatForForm] = useState("");
  const [catalog, setCatalog] = useState(true);
  const [imageUrlsText, setImageUrlsText] = useState("");

  // choose between URLs and local file upload
  const [imageMode, setImageMode] = useState("urls");
  const [localFiles, setLocalFiles] = useState([]);

  // stock-only modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [newStock, setNewStock] = useState(0);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setPrice("");
    setStock("");
    setMinStock("");
    setWeightKg("");
    setCatForForm("");
    setCatalog(true);
    setImageUrlsText("");
    setImageMode("urls");
    setLocalFiles([]);
  };

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category) p.set("category", category);
    if (catalogFilter !== "") p.set("catalog", catalogFilter);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [search, category, catalogFilter, page, limit]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/products?${query}`, {
        headers: authHeader(),
      });
      setItems(res.data.items || res.data.products || []);
      setTotal(
        res.data.total ?? (res.data.products ? res.data.products.length : 0)
      );
    } catch (e) {
      console.error("Error fetching products:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get(`${API}/category`, {
        headers: authHeader(),
      });
      setCategories(data.categories ?? []);
    } catch (e) {
      console.error("Fetch categories failed:", e);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [query]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("pos-token") },
    });
    socket.on("connect", () => {
      console.log("✅ Connected to socket server:", socket.id);
    });

    socket.on("inventory:update", ({ productId, stock, price, minStock, sold, catalog }) => {
      setItems((prev) =>
        prev.map((p) =>
          p._id === productId
            ? {
                ...p,
                stock: stock ?? p.stock,
                price: price ?? p.price,
                minStock: minStock ?? p.minStock,
                sold: sold ?? p.sold,
                catalog: typeof catalog === "boolean" ? catalog : p.catalog,
              }
            : p
        )
      );
    });

    socket.on("inventory:bulk", (updates) => {
      setItems((prev) => {
        const map = new Map(prev.map((p) => [p._id, p]));
        for (const u of updates) {
          if (map.has(u.productId)) {
            const old = map.get(u.productId);
            map.set(u.productId, { ...old, stock: u.stock ?? old.stock });
          }
        }
        return Array.from(map.values());
      });
    });

    socket.on("inventory:created", (p) => {
      setItems((prev) => [p, ...prev]);
      setTotal((t) => t + 1);
    });

    socket.on("inventory:deleted", ({ productId }) => {
      setItems((prev) => prev.filter((p) => p._id !== productId));
      setTotal((t) => Math.max(0, t - 1));
    });

    return () => socket.disconnect();
  }, []);

  const toggleCatalog = async (id, value) => {
    const prev = items.slice();
    setItems((arr) =>
      arr.map((p) => (p._id === id ? { ...p, catalog: value } : p))
    );
    try {
      await axios.patch(
        `${API}/products/${id}/catalog`,
        { value },
        { headers: { ...authHeader(), "Content-Type": "application/json" } }
      );
    } catch (e) {
      setItems(prev);
      alert(e?.response?.data?.message || "Failed to update catalog flag");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let uploadedUrls = [];
      if (imageMode === "upload" && localFiles.length > 0) {
        const fd = new FormData();
        for (const f of localFiles) fd.append("images", f);
        const up = await axios.post(`${API}/products/upload`, fd, {
          headers: { ...authHeader(), "Content-Type": "multipart/form-data" },
        });
        uploadedUrls = (up.data?.images || []).map((x) => x.url);
      }

      const images = [...toUrlArray(imageUrlsText), ...uploadedUrls];

      const payload = {
        name,
        price: Number(price),
        stock: Number(stock || 0),
        minStock: minStock === "" ? 0 : Number(minStock),
        weightKg: weightKg === "" ? null : Number(weightKg),
        category: catForForm,
        catalog: !!catalog,
        images,
      };

      if (editId) {
        await axios.patch(`${API}/products/${editId}`, payload, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
        });
        alert("Product updated!");
      } else {
        await axios.post(`${API}/products`, payload, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
        });
        alert("Product added!");
      }

      setShowAdd(false);
      resetForm();
      fetchProducts();
    } catch (e) {
      console.error("Save product error:", e);
      alert(e?.response?.data?.message || "Failed to save product");
    }
  };

  const onEdit = (p) => {
    setEditId(p._id);
    setName(p.name || "");
    setPrice(p.price ?? "");
    setStock(p.stock ?? "");
    setMinStock(p.minStock ?? "");
    setWeightKg(p.weightKg ?? "");
    setCatForForm(p.category?._id || "");
    setCatalog(!!p.catalog);
    setImageUrlsText(
      Array.isArray(p.images)
        ? p.images
            .map((x) => (typeof x === "string" ? x : x?.url || ""))
            .filter(Boolean)
            .join(", ")
        : ""
    );
    setImageMode("urls");
    setLocalFiles([]);
    setShowAdd(true);
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await axios.delete(`${API}/products/${id}`, { headers: authHeader() });
      fetchProducts();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete");
    }
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setNewStock(product?.stock ?? 0);
    setShowStockModal(true);
  };

  const adjustNewStock = (delta) => {
    setNewStock((prev) => {
      const n = Number(prev || 0) + delta;
      return n < 0 ? 0 : n;
    });
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    if (!stockProduct) return;
    try {
      await axios.patch(
        `${API}/products/${stockProduct._id}`,
        { stock: Number(newStock) },
        { headers: { ...authHeader(), "Content-Type": "application/json" } }
      );
      alert("Stock updated!");
      setShowStockModal(false);
      setStockProduct(null);
      fetchProducts();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update stock");
    }
  };

  const lowStockItems = items.filter(
    (p) => (p.stock ?? 0) > 0 && (p.minStock ?? 0) > 0 && p.stock < p.minStock
  );
  const outOfStockItems = items.filter((p) => (p.stock ?? 0) <= 0);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inventory Tracking</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
        >
          + Add product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <KpiCard title="Total Items" value={total} color="bg-green-500" />
        <KpiCard
          title="In Stock"
          value={items.filter((i) => (i.stock ?? 0) > 0).length}
          color="bg-green-500"
        />
        <KpiCard title="Low Stock" value={lowStockItems.length} color="bg-amber-500" />
        <KpiCard title="Out of Stock" value={outOfStockItems.length} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              className="border rounded-xl px-3 py-2 w-72"
              placeholder="Search item"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="border rounded-xl px-3 py-2"
              value={category}
              onChange={(e) => {
                setPage(1);
                setCategory(e.target.value);
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.categoryName}
                </option>
              ))}
            </select>
            <select
              className="border rounded-xl px-3 py-2"
              value={catalogFilter}
              onChange={(e) => {
                setPage(1);
                setCatalogFilter(e.target.value);
              }}
            >
              <option value="">Catalog: All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
            <span className="text-sm text-gray-500">
              {loading ? "Loading…" : `Showing ${items.length} of ${total}`}
            </span>
          </div>

          <div className="overflow-x-auto border rounded-2xl bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Min</th>
                  <th className="px-4 py-3">Weight (kg)</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Catalog</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan="8">
                      No products found.
                    </td>
                  </tr>
                )}
                {items.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={firstImage(p) || DATA_PLACEHOLDER_48}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={(e) => (e.currentTarget.src = DATA_PLACEHOLDER_48)}
                        />
                        <div className="font-medium">{p.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p?.category?.name || p?.category?.categoryName || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={(p.stock ?? 0) <= 0 ? "text-red-600 font-medium" : ""}>
                        {p.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.minStock ?? 0}</td>
                    <td className="px-4 py-3">
                      {p.weightKg != null
                        ? Number(p.weightKg).toFixed(3).replace(/\.?0+$/, "")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">₱{Number(p.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={!!p.catalog}
                          onChange={(e) => toggleCatalog(p._id, e.target.checked)}
                        />
                        <div
                          className="relative w-11 h-6 rounded-full bg-gray-200 transition-colors duration-200 peer-checked:bg-green-500
                                     after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                     after:h-5 after:w-5 after:rounded-full after:bg-white
                                     after:transition-transform after:duration-200 peer-checked:after:translate-x-5"
                        />
                        <span className="ml-2 text-xs text-gray-600">
                          {p.catalog ? "Yes" : "No"}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onEdit(p)}
                        className="text-blue-600 hover:underline mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(p._id)}
                        className="text-red-600 hover:underline mr-3"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => openStockModal(p)}
                        className="text-green-600 hover:underline"
                      >
                        Add Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-1 mt-2 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border text-gray-600 disabled:opacity-50"
            >
              Prev
            </button>
            <div className="text-gray-500">Page {page}</div>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded border text-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="font-semibold text-amber-800 mb-3">⚠️ Low Stock Alerts</div>
              {lowStockItems.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between bg-white rounded-xl p-3 mb-2 last:mb-0"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">
                      Stock {p.stock} / Min {p.minStock}
                    </div>
                  </div>
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200"
                    onClick={() => openStockModal(p)}
                  >
                    Add Stock
                  </button>
                </div>
              ))}
            </div>
          )}

          {outOfStockItems.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <div className="font-semibold text-rose-800 mb-3">⛔ Out of Stock</div>
              {outOfStockItems.map((p) => (
                <div
                  key={p._id}
                  className="flex items-center justify-between bg-white rounded-xl p-3 mb-2 last:mb-0"
                >
                  <div className="font-medium">{p.name}</div>
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                    onClick={() => openStockModal(p)}
                  >
                    Restock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editId ? "Edit Product" : "Add New Product"}
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded-lg px-3 py-2"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    className="w-full border rounded-lg px-3 py-2"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={catForForm}
                  onChange={(e) => setCatForForm(e.target.value)}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={catalog}
                    onChange={(e) => setCatalog(e.target.checked)}
                  />
                  <span className="text-sm font-medium">Show in Catalog</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Product Images</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg ${
                      imageMode === "urls"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setImageMode("urls")}
                  >
                    URLs
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-lg ${
                      imageMode === "upload"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => setImageMode("upload")}
                  >
                    Upload Files
                  </button>
                </div>

                {imageMode === "urls" ? (
                  <textarea
                    className="w-full border rounded-lg px-3 py-2"
                    rows="3"
                    placeholder="Enter image URLs (comma or newline separated)"
                    value={imageUrlsText}
                    onChange={(e) => setImageUrlsText(e.target.value)}
                  />
                ) : (
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="w-full border rounded-lg px-3 py-2"
                    onChange={(e) => setLocalFiles(Array.from(e.target.files || []))}
                  />
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {editId ? "Update Product" : "Add Product"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowStockModal(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Stock Adjustment</h3>
              <button onClick={() => setShowStockModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="mb-3">
              <div className="font-medium">{stockProduct?.name}</div>
              <div className="text-xs text-gray-500">
                Current stock {stockProduct?.stock ?? 0}
              </div>
            </div>

            <form onSubmit={handleStockUpdate} className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="w-10 h-10 border rounded-lg hover:bg-gray-50"
                  onClick={() => adjustNewStock(-1)}
                >
                  –
                </button>
                <input
                  type="number"
                  min="0"
                  className="w-24 border rounded-lg px-3 py-2 text-center"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
                <button
                  type="button"
                  className="w-10 h-10 border rounded-lg hover:bg-gray-50"
                  onClick={() => adjustNewStock(1)}
                >
                  +
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg"
              >
                Apply
              </button>
            </form>
          </div>
        </div>
      )}

      <InventoryAudit />
    </div>
  );
}