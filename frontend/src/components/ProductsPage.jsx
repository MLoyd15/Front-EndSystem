import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
});

// helper: turn comma/newline-separated text into array of URLs
const toUrlArray = (text) =>
  String(text || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function ProductsPage() {
  // list & filters
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [catalogFilter, setCatalogFilter] = useState(""); // "", "true", "false"
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // categories
  const [categories, setCategories] = useState([]);

  // add/edit modal
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [catForForm, setCatForForm] = useState("");
  const [catalog, setCatalog] = useState(true);
  const [imageUrlsText, setImageUrlsText] = useState(""); // <— URLs instead of files

  const resetForm = () => {
    setEditId(null);
    setName("");
    setPrice("");
    setStock("");
    setCatForForm("");
    setCatalog(true);
    setImageUrlsText("");
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
      const { data } = await axios.get("http://localhost:5000/api/category", {
        headers: authHeader(),
      });
      setCategories(data.categories ?? []);
    } catch (e) {
      console.error(
        "Fetch categories failed:",
        e?.response?.status,
        e?.response?.data || e.message
      );
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // catalog toggle (optimistic)
  const toggleCatalog = async (id, value) => {
    const prev = items.slice();
    setItems((arr) => arr.map((p) => (p._id === id ? { ...p, catalog: value } : p)));
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

  // add / edit submit — keep SAME endpoints, send JSON with URL array
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        price: Number(price),
        stock: Number(stock || 0),
        category: catForForm,
        catalog: !!catalog,
        images: toUrlArray(imageUrlsText), // <— array of URLs
      };

      if (editId) {
        await axios.put(`${API}/products/${editId}`, payload, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
        });
        alert("Product updated!");
      } else {
        await axios.post(`${API}/products/add`, payload, {
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
    setPrice(p.price || "");
    setStock(p.stock || "");
    setCatForForm(p.category?._id || "");
    setCatalog(!!p.catalog);
    setImageUrlsText((p.images || []).join(", ")); // prefill URLs
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

  // KPI helpers
  const kpiInCatalog = items.filter((i) => i.catalog).length;
  const kpiOutOfStock = items.filter((i) => (i.stock ?? 0) <= 0).length;
  const kpiLowStock = items.filter((i) => (i.stock ?? 0) > 0 && i.stock <= 5).length;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* Header + Add */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Items</h1>
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

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Kpi label="Registered items" value={total} />
        <Kpi label="In catalog" value={kpiInCatalog} />
        <Kpi label="Out of stock" value={kpiOutOfStock} danger />
        <Kpi label="Low stock (&le;5)" value={kpiLowStock} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          className="border rounded-xl px-3 py-2 w-72"
          placeholder="Item, value or code"
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

      {/* Table */}
      <div className="overflow-x-auto border rounded-2xl bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Catalog</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-500" colSpan="6">
                  No products found.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p._id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images?.[0] || "https://via.placeholder.com/48"} // <— direct URL
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      {p.sku && (
                        <div className="text-xs text-gray-500">SKU {p.sku}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p?.category?.name || p?.category?.categoryName || "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={p.stock <= 0 ? "text-red-600 font-medium" : ""}>
                    {p.stock ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">${Number(p.price || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!!p.catalog}
                      onChange={(e) => toggleCatalog(p._id, e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-green-500 transition relative">
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition peer-checked:translate-x-5" />
                    </div>
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
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
        >
          Prev
        </button>
        <div className="text-sm">Page {page}</div>
        <button
          disabled={page * limit >= total}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-lg border disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Add / Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAdd(false)}
          />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editId ? "Edit product" : "Add product"}
              </h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Stock"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={catForForm}
                onChange={(e) => setCatForForm(e.target.value)}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.categoryName}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={catalog}
                  onChange={(e) => setCatalog(e.target.checked)}
                />
                <span>Show in catalog</span>
              </label>

              {/* URLs instead of files */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Image URLs (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://example.com/a.jpg, https://example.com/b.png"
                  value={imageUrlsText}
                  onChange={(e) => setImageUrlsText(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Comma or newline separated. Leave blank to skip.
                </div>
                {/* small preview */}
                {toUrlArray(imageUrlsText).length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {toUrlArray(imageUrlsText).slice(0, 6).map((u, i) => (
                      <img
                        key={i}
                        alt=""
                        className="w-14 h-14 object-cover rounded"
                        src={u}
                        onError={(e) => (e.currentTarget.style.opacity = 0.2)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  {editId ? "Save changes" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowAdd(false);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, danger }) {
  return (
    <div className={`rounded-2xl p-4 shadow ${danger ? "bg-red-50" : "bg-white"}`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
