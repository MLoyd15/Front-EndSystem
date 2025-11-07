import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import InventoryAudit from "./InventoryAudit";
import KpiCard from "../components/kpicard";
import Categories from "./categories";
import { VITE_API_BASE, VITE_SOCKET_URL } from "../config";

// ─── Config ────────────────────────────────────────────────────────────────────
const API = VITE_API_BASE;
const SOCKET_URL = VITE_SOCKET_URL;
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
});

const DATA_PLACEHOLDER_48 =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>
       <rect width='100%' height='100%' fill='#e5e7eb'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             font-family='sans-serif' font-size='10' fill='#9ca3af'>no image</text>
     </svg>`
  );

// ─── Modal Component ───────────────────────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, message, type = "info" }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      default:
        return "ℹ";
    }
  };

  const getColors = () => {
    switch (type) {
      case "success":
        return "bg-emerald-100 text-emerald-700 ring-emerald-200";
      case "error":
        return "bg-red-100 text-red-700 ring-red-200";
      case "warning":
        return "bg-amber-100 text-amber-700 ring-amber-200";
      default:
        return "bg-blue-100 text-blue-700 ring-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-scaleIn">
        <div className={`flex items-center gap-4 p-4 rounded-xl ring-2 ${getColors()}`}>
          <div className="text-3xl font-bold">{getIcon()}</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm opacity-90">{message}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-800 hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

// ─── Confirm Modal Component ───────────────────────────────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 ring-2 ring-red-200 flex items-center justify-center flex-shrink-0 text-xl font-bold">
            ⚠
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
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const toUrlArray = (text) =>
  String(text || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const firstImage = (p) => {
  const x = p?.images?.[0];
  return typeof x === "string" ? x : x?.url || null;
};

export default function ProductsPage() {
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: "", message: "" });

  const showModal = (title, message, type = "success") => {
    setModal({ title, message, type });
  };

  const closeModal = () => {
    setModal(null);
  };

  const showConfirmModal = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, onConfirm: null, title: "", message: "" });
  };

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [categories, setCategories] = useState([]);

  // Add category modal state
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

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
  const [description, setDescription] = useState("");

  const [imageMode, setImageMode] = useState("urls");
  const [localFiles, setLocalFiles] = useState([]);

  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [newStock, setNewStock] = useState(0);

  // Categories toggle state
  const [showCategories, setShowCategories] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setDescription("");
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
      showModal("Success", "Stock updated!", "success");
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

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (category) p.set("category", category);
    if (catalogFilter !== "") p.set("catalog", catalogFilter);
    if (minPrice !== "") p.set("minPrice", String(minPrice));
    if (maxPrice !== "") p.set("maxPrice", String(maxPrice));
    if (stockFilter !== "") p.set("stock", stockFilter);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [search, category, catalogFilter, minPrice, maxPrice, stockFilter, page, limit]);

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
      showModal("Error", "Failed to fetch products", "error");
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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      showModal("Validation Error", "Category name cannot be empty", "warning");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/category/add`,
        { categoryName: newCategoryName.trim() },
        { 
          headers: { ...authHeader(), "Content-Type": "application/json" },
          validateStatus: function (status) {
            return true;
          }
        }
      );
      
      if (res.status >= 200 && res.status < 300 && res.data.success) {
        const message = res.data.message || "Category added successfully!";
        const isApprovalPending = message.includes("approval") || message.includes("pending");
        
        if (isApprovalPending) {
          showModal("Approval Pending", "Category has been submitted and is waiting for superadmin/owner approval.", "info");
        } else {
          const newCategory = res.data.category || res.data;
          setCategories((prev) => [...prev, newCategory]);
          setCatForForm(newCategory._id);
          showModal("Success", "Category added successfully!", "success");
        }
        
        setShowAddCategory(false);
        setNewCategoryName("");
        fetchCategories();
      } else {
        showModal("Error", res.data.message || "Failed to add category", "error");
      }
    } catch (e) {
      console.error("Add category error:", e);
      showModal("Error", e?.response?.data?.message || "Failed to add category", "error");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [query]);

  const toggleCatalog = async (id, value) => {
    const prev = items.slice();
    setItems((arr) =>
      arr.map((p) => (p._id === id ? { ...p, catalog: value } : p))
    );
    try {
      const response = await axios.patch(
        `${API}/products/${id}/catalog`,
        { value },
        { 
          headers: { ...authHeader(), "Content-Type": "application/json" },
          validateStatus: function (status) {
            return true;
          }
        }
      );
      
      if (response.status >= 200 && response.status < 300 && response.data.success) {
        const message = response.data.message || `Catalog ${value ? "enabled" : "disabled"} successfully`;
        const isApprovalPending = response.data.requiresApproval || message.includes("pending") || message.includes("approval");
        
        if (isApprovalPending) {
          showModal("Approval Pending", "Catalog change has been submitted and is waiting for superadmin approval.", "info");
        } else {
          showModal("Success", `Catalog ${value ? "enabled" : "disabled"} successfully`, "success");
        }
      } else {
        setItems(prev);
        showModal("Error", response.data.message || "Failed to update catalog flag", "error");
      }
    } catch (e) {
      setItems(prev);
      showModal("Error", e?.response?.data?.message || "Failed to update catalog flag", "error");
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
        description,
        price: Number(price),
        stock: Number(stock || 0),
        minStock: minStock === "" ? 0 : Number(minStock),
        weightKg: weightKg === "" ? null : Number(weightKg),
        category: catForForm,
        catalog: !!catalog,
        images,
      };

      if (editId) {
        const response = await axios.patch(`${API}/products/${editId}`, payload, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
          validateStatus: function (status) {
            return true;
          }
        });
        
        if (response.status >= 200 && response.status < 300 && response.data.success) {
          const message = response.data.message || "Product updated successfully!";
          const isApprovalPending = response.data.requiresApproval || message.includes("approval") || message.includes("pending");
          
          if (isApprovalPending) {
            showModal("Approval Pending", "Product update has been submitted and is waiting for superadmin approval.", "info");
          } else {
            showModal("Success", "Product updated successfully!", "success");
          }
        } else {
          showModal("Error", response.data.message || "Failed to update product", "error");
        }
      } else {
        const response = await axios.post(`${API}/products`, payload, {
          headers: { ...authHeader(), "Content-Type": "application/json" },
          validateStatus: function (status) {
            return true;
          }
        });
        
        if (response.status >= 200 && response.status < 300 && response.data.success) {
          const message = response.data.message || "Product added successfully!";
          const isApprovalPending = response.data.requiresApproval || message.includes("approval") || message.includes("pending");
          
          if (isApprovalPending) {
            showModal("Approval Pending", "Product has been submitted and is waiting for superadmin approval.", "info");
          } else {
            showModal("Success", "Product added successfully!", "success");
          }
        } else {
          showModal("Error", response.data.message || "Failed to add product", "error");
        }
      }

      setShowAdd(false);
      resetForm();
      fetchProducts();
    } catch (e) {
      console.error("Save product error:", e);
      showModal("Error", e?.response?.data?.message || "Failed to save product", "error");
    }
  };

  const onEdit = (p) => {
    setEditId(p._id);
    setName(p.name || "");
    setDescription(p.description || "");
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
    showConfirmModal(
      "Delete Product",
      "Are you sure you want to delete this product? This action cannot be undone.",
      async () => {
        try {
          const response = await axios.delete(`${API}/products/${id}`, { 
            headers: authHeader(),
            validateStatus: function (status) {
              return true;
            }
          });
          
          if (response.status >= 200 && response.status < 300 && response.data.success) {
            const message = response.data.message || "Product deleted successfully!";
            const isApprovalPending = response.data.requiresApproval || message.includes("pending") || message.includes("approval");
            
            if (isApprovalPending) {
              showModal("Approval Pending", "Product deletion has been submitted and is waiting for superadmin approval.", "info");
            } else {
              showModal("Success", "Product deleted successfully!", "success");
            }
            fetchProducts();
          } else {
            showModal("Error", response.data.message || "Failed to delete product", "error");
          }
        } catch (e) {
          showModal("Error", e?.response?.data?.message || "Failed to delete", "error");
        }
      }
    );
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
      const response = await axios.patch(
        `${API}/products/${stockProduct._id}`,
        { stock: Number(newStock) },
        { 
          headers: { ...authHeader(), "Content-Type": "application/json" },
          validateStatus: function (status) {
            return true;
          }
        }
      );
      
      if (response.status >= 200 && response.status < 300 && response.data.success) {
        const message = response.data.message || "Stock updated successfully!";
        const isApprovalPending = response.data.requiresApproval || message.includes("approval") || message.includes("pending");
        
        if (isApprovalPending) {
          showModal("Approval Pending", "Stock update has been submitted and is waiting for superadmin approval.", "info");
        } else {
          showModal("Success", "Stock updated successfully!", "success");
        }
      } else {
        showModal("Error", response.data.message || "Failed to update stock", "error");
      }
      
      setShowStockModal(false);
      setStockProduct(null);
      fetchProducts();
    } catch (err) {
      showModal("Error", err?.response?.data?.message || "Failed to update stock", "error");
    }
  };

  const lowStockItems = items.filter(
    (p) => (p.stock ?? 0) > 0 && (p.minStock ?? 0) > 0 && p.stock < p.minStock
  );
  const outOfStockItems = items.filter((p) => (p.stock ?? 0) <= 0);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {modal && (
        <Modal
          isOpen={!!modal}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inventory Tracking</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition"
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

      <div className="w-full">
        <div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <button
              onClick={() => setShowFilters(true)}
              className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition font-medium"
            >
              Filters
            </button>
            <button
              onClick={() => setShowCategories(!showCategories)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-medium"
            >
              Manage Categories
            </button>
            <span className="text-sm text-gray-500">
              Showing {items.length} of {total}
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
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td className="px-4 py-10 text-center text-gray-500" colSpan="8">
                      No products found.
                    </td>
                  </tr>
                )}
                {items.map((p) => {
                  const stock = p.stock ?? 0;
                  const minStock = p.minStock ?? 0;
                  let bgColor = "bg-white";
                  
                  if (stock <= 0) {
                    bgColor = "bg-red-100";
                  } else if (minStock > 0 && stock < minStock) {
                    bgColor = "bg-yellow-100";
                  }
                  
                  return (
                    <tr key={p._id} className={`border-t ${bgColor}`}>
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
                        <div className="flex items-center gap-2">
                          <span className={(p.stock ?? 0) <= 0 ? "text-red-600 font-bold" : "font-medium"}>
                            {p.stock ?? 0}
                          </span>
                          {(p.stock ?? 0) <= 0 && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded-full shadow-sm">
                              No Stock
                            </span>
                          )}
                          {(p.stock ?? 0) > 0 && (p.minStock ?? 0) > 0 && (p.stock < p.minStock) && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-yellow-500 text-white rounded-full shadow-sm">
                              Low Stock
                            </span>
                          )}
                        </div>
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => onEdit(p)}
                            className="px-3 py-1 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(p._id)}
                            className="px-3 py-1 text-sm rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => openStockModal(p)}
                            className="px-3 py-1 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            Add Stock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
      </div>

      {/* Add/Edit Product Modal */}
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
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="4"
                  placeholder="Describe your product features, specifications, or any additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length} characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10000"
                    step="0.01"
                    className={`w-full border rounded-lg px-3 py-2 ${
                      price && (Number(price) < 1 || Number(price) > 10000)
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  {price && (Number(price) < 1 || Number(price) > 10000) && (
                    <p className="text-red-600 text-xs mt-1">
                      Price must be between 1 and 10,000
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    className={`w-full border rounded-lg px-3 py-2 ${
                      stock && (Number(stock) < 0 || Number(stock) > 10000)
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                  {stock && (Number(stock) < 0 || Number(stock) > 10000) && (
                    <p className="text-red-600 text-xs mt-1">
                      Stock must be between 0 and 10,000
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock</label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    className={`w-full border rounded-lg px-3 py-2 ${
                      minStock && (Number(minStock) < 0 || Number(minStock) > 10000)
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                  {minStock && (Number(minStock) < 0 || Number(minStock) > 10000) && (
                    <p className="text-red-600 text-xs mt-1">
                      Min Stock must be between 0 and 10,000
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0.001"
                    max="10000"
                    step="0.001"
                    className={`w-full border rounded-lg px-3 py-2 ${
                      weightKg && (Number(weightKg) < 0.001 || Number(weightKg) > 1000)
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                  {weightKg && (Number(weightKg) < 0.001 || Number(weightKg) > 1000) && (
                    <p className="text-red-600 text-xs mt-1">
                      Weight must be between 0.001 and 10,000 kg
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Category</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add New Category
                  </button>
                </div>
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

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddCategory(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button 
                onClick={() => setShowAddCategory(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
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
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    className={`w-full border rounded-lg px-3 py-2 text-center ${
                      newStock && (Number(newStock) < 0 || Number(newStock) > 10000)
                        ? "border-red-500 focus:ring-red-500"
                        : ""
                    }`}
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                  />
                  {newStock && (Number(newStock) < 0 || Number(newStock) > 10000) && (
                    <p className="text-red-600 text-xs mt-1 text-center">
                      Stock must be between 0 and 10,000
                    </p>
                  )}
                </div>
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

      {/* Categories Modal */}
      {showCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCategories(false)}
          />
          <div className="relative bg-white w-full max-w-6xl rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Category Management</h2>
              <button
                onClick={() => setShowCategories(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <Categories />
            </div>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowFilters(false)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Search</label>
                <input
                  className="border rounded-xl px-3 py-2 w-full"
                  placeholder="Search item"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Category</label>
                <select
                  className="border rounded-xl px-3 py-2 w-full"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Catalog</label>
                <select
                  className="border rounded-xl px-3 py-2 w-full"
                  value={catalogFilter}
                  onChange={(e) => setCatalogFilter(e.target.value)}
                >
                  <option value="">Catalog: All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Price Range</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="Min price"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    className="border rounded-xl px-3 py-2 w-full"
                    placeholder="Max price"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Stock</label>
                <select
                  className="border rounded-xl px-3 py-2 w-full"
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="in">In stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setCatalogFilter("");
                  setMinPrice("");
                  setMaxPrice("");
                  setStockFilter("");
                }}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Component */}

      <InventoryAudit />
    </div>
  );
}