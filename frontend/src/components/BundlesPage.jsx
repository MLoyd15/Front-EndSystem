import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { VITE_API_BASE } from "../config"

const API = VITE_API_BASE;

const peso = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })
    : "—";

// Modal Component
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${getColors()} ring-2 flex items-center justify-center flex-shrink-0 text-xl font-bold`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirm Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const BundlesPage = () => {
  const [bundles, setBundles] = useState([]);
  const [bundleName, setBundleName] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [editBundle, setEditBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const formTopRef = useRef(null);
  const nameInputRef = useRef(null);

  const showModal = (title, message, type = "info") => {
    setModal({ isOpen: true, title, message, type });
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // Fetch bundles
  const fetchBundles = async () => {
    try {
      console.log("🔍 Fetching bundles from:", `${API}/admin/bundles`);
      const response = await axios.get(`${API}/admin/bundles`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          "Content-Type": "application/json"
        },
      });
      console.log("✅ Bundles response:", response.data);
      const bundlesArray = Array.isArray(response.data)
        ? response.data
        : response.data.bundles ?? response.data.items ?? [];
      setBundles(bundlesArray);
    } catch (error) {
      console.error("❌ Error fetching bundles:", error);
      console.error("❌ Error response:", error.response?.data);
      setBundles([]);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      console.log("🔍 Fetching products from:", `${API}/products`);
      const response = await axios.get(`${API}/products`, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          "Content-Type": "application/json"
        },
      });
      console.log("✅ Products response:", response.data);
      const fetchedProducts = Array.isArray(response.data)
        ? response.data
        : response.data.products ?? response.data.items ?? [];
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("❌ Error fetching products:", error);
      console.error("❌ Error response:", error.response?.data);
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchBundles(), fetchProducts()]);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  // Edit Bundle
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!bundleName.trim()) {
      showModal("Validation Error", "Bundle name is required", "error");
      return;
    }

    if (!bundlePrice || Number(bundlePrice) <= 0) {
      showModal("Validation Error", "Please enter a valid price", "error");
      return;
    }

    if (selectedProducts.length === 0) {
      showModal("Validation Error", "Please add at least one product to the bundle", "error");
      return;
    }

    const payload = {
      name: bundleName.trim(),
      description: bundleDescription.trim(),
      price: Number(bundlePrice),
      products: selectedProducts.map((p) => ({
        product: p.product,
        quantity: Number(p.quantity) || 1,
      })),
    };

    try {
      console.log("📤 Submitting bundle:", payload);
      
      if (editBundle) {
        const response = await axios.put(`${API}/admin/bundles/${editBundle}`, payload, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
            "Content-Type": "application/json"
          },
        });
        console.log("✅ Update response:", response.data);
        showModal("Success", "Bundle updated successfully!", "success");
      } else {
        const response = await axios.post(`${API}/admin/bundles`, payload, {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
            "Content-Type": "application/json"
          },
        });
        console.log("✅ Create response:", response.data);
        showModal("Success", "Bundle created successfully!", "success");
      }

      fetchBundles();
      handleCancel(); 
    } catch (error) {
      console.error("❌ Error submitting bundle:", error.response?.data ?? error);
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      showModal("Error", `Error creating/updating bundle: ${errorMsg}`, "error");
    }
  };

  const handleEdit = (bundle) => {
    setEditBundle(bundle._id);
    setBundleName(bundle.name);
    setBundleDescription(bundle.description ?? "");
    setBundlePrice(bundle.price ?? "");
    
    // Handle both old format (products) and new admin format (items)
    const bundleItems = bundle.items ?? bundle.products ?? [];
    setSelectedProducts(bundleItems.map((p) => ({
      product: p.productId ?? p.product?._id ?? p.product,
      quantity: p.quantity,
    })));

    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus({ preventScroll: true });
    });
  };

  // Delete Bundle
  const handleDelete = async (id) => {
    showConfirm(
      "Delete Bundle",
      "Are you sure you want to delete this bundle? This action cannot be undone.",
      async () => {
        try {
          console.log("🗑️ Deleting bundle:", id);
          const response = await axios.delete(`${API}/admin/bundles/${id}`, {
            headers: { 
              Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
              "Content-Type": "application/json"
            },
          });
          console.log("✅ Delete response:", response.data);
          fetchBundles();
          showModal("Success", "Bundle deleted successfully!", "success");
        } catch (error) {
          console.error("❌ Error deleting bundle:", error);
          console.error("❌ Error response:", error.response?.data);
          const errorMsg = error.response?.data?.message || error.message || "Unknown error";
          showModal("Error", `Error deleting bundle: ${errorMsg}`, "error");
        }
      }
    );
  };

  const handleProductChange = (e, index) => {
    const value = e.target.value;
    setSelectedProducts((prev) => prev.map((p, i) => (i === index ? { ...p, product: value } : p)));
  };

  const handleQuantityChange = (e, index) => {
    const value = Number(e.target.value) || 1;
    setSelectedProducts((prev) => prev.map((p, i) => (i === index ? { ...p, quantity: value } : p)));
  };

  const addProductField = () => setSelectedProducts((prev) => [...prev, { product: "", quantity: 1 }]);
  const removeProductField = (index) => setSelectedProducts((prev) => prev.filter((_, i) => i !== index));

  // cancel editing helper
  const handleCancel = () => {
    setEditBundle(null);
    setBundleName("");
    setBundleDescription("");
    setBundlePrice("");
    setSelectedProducts([]);
  };

  // Calculate total price of selected products
  const suggestedPrice = useMemo(() => {
    return selectedProducts.reduce((total, item) => {
      const product = products.find(p => p._id === item.product);
      if (product && product.price) {
        return total + (Number(product.price) * Number(item.quantity || 0));
      }
      return total;
    }, 0);
  }, [selectedProducts, products]);

  // Calculate savings
  const savings = useMemo(() => {
    if (!bundlePrice || suggestedPrice === 0) return 0;
    return suggestedPrice - Number(bundlePrice);
  }, [bundlePrice, suggestedPrice]);

  const totalBundles = useMemo(() => bundles.length, [bundles]);

  // Keep edited bundle on top
  const displayedBundles = useMemo(() => {
    if (!editBundle) return bundles;
    const idx = bundles.findIndex((b) => b._id === editBundle);
    if (idx === -1) return bundles;
    return [bundles[idx], ...bundles.slice(0, idx), ...bundles.slice(idx + 1)];
  }, [bundles, editBundle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-emerald-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading bundles...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
      
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      <div className="p-6 bg-gray-100 min-h-screen">
        <h1 className="text-xl font-semibold mb-8">Manage Bundles</h1>

        <div className="w-full flex flex-col lg:flex-row gap-6">
          {/* Left: 40% */}
          <div
            ref={formTopRef}
            className="w-full lg:basis-[40%] lg:shrink-0 bg-white rounded-2xl shadow-md scroll-mt-24"
          >
            <div className="px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-semibold">
                  {editBundle ? "Edit Bundle" : "Add Bundle"}
                </h2>
                <p className="text-sm text-gray-500">
                  Create, edit, and organize your product bundles.
                </p>
              </div>
              {editBundle && (
                <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                  Editing
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bundle Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. Starter Pack"
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  required
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional short description"
                  value={bundleDescription}
                  onChange={(e) => setBundleDescription(e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  required
                  className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                
                {/* Price Comparison */}
                {selectedProducts.length > 0 && suggestedPrice > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">Products Total:</span>
                      <span className="font-semibold text-gray-900">{peso(suggestedPrice)}</span>
                    </div>
                    
                    {bundlePrice && Number(bundlePrice) > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">Bundle Price:</span>
                          <span className="font-semibold text-gray-900">{peso(Number(bundlePrice))}</span>
                        </div>
                        
                        <div className="pt-2 mt-2 border-t border-blue-300">
                          {savings > 0 ? (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-emerald-700">Customer Savings:</span>
                              <span className="text-sm font-bold text-emerald-700">{peso(savings)}</span>
                            </div>
                          ) : savings < 0 ? (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-amber-700">Markup:</span>
                              <span className="text-sm font-bold text-amber-700">{peso(Math.abs(savings))}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 text-center">Same as products total</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold">
                    Products in Bundle <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addProductField}
                    className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
                  >
                    Add Product
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedProducts.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No products added yet. Click "Add Product" to start.</p>
                  ) : (
                    selectedProducts.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                        <select
                          value={p.product}
                          onChange={(e) => handleProductChange(e, idx)}
                          className="flex-1 border px-3 py-2 rounded-lg"
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map((prod) => (
                            <option key={prod._id} value={prod._id}>
                              {prod.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min={1}
                          value={p.quantity}
                          onChange={(e) => handleQuantityChange(e, idx)}
                          className="w-28 border px-3 py-2 rounded-lg"
                          required
                        />

                        <button
                          type="button"
                          onClick={() => removeProductField(idx)}
                          className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition"
                >
                  {editBundle ? "Save Changes" : "Add Bundle"}
                </button>

                {editBundle && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex justify-center items-center gap-2 rounded-lg bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 text-sm font-medium px-4 py-2 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Right: 60% */}
          <div className="w-full lg:basis-[60%] lg:min-w-0 bg-white rounded-2xl shadow-md flex flex-col">
            <div className="px-5 py-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-semibold">Existing Bundles</h3>
              <div className="text-sm text-gray-500">
                Total bundles: <span className="font-medium text-gray-700">{totalBundles}</span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto overflow-x-hidden max-h-[700px]">
              {displayedBundles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 grid place-items-center mb-2">
                    <span className="text-gray-400">📦</span>
                  </div>
                  <p className="text-gray-500">No bundles added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-4">
                  {displayedBundles.map((bundle) => {
                    const items = bundle.items ?? bundle.products ?? [];
                    const itemCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
                    const isEditingThis = editBundle === bundle._id;

                    return (
                      <div
                        key={bundle._id}
                        className={
                          "border rounded-xl bg-gray-50 transition-colors p-4 flex flex-col min-h-[220px] " +
                          (isEditingThis ? "ring-2 ring-amber-300 bg-amber-50/40" : "hover:bg-gray-100/40")
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold leading-tight">{bundle.name}</h4>
                            {bundle.description && (
                              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                {bundle.description}
                              </p>
                            )}
                          </div>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium bg-white">
                            {peso(Number(bundle.price))}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {items.length === 0 ? (
                            <span className="text-xs text-gray-500">No items</span>
                          ) : (
                            items.map((p, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-white border rounded-full px-2.5 py-1 text-gray-700"
                              >
                                {(p.productName ?? p.product?.name ?? p.product)} × {p.quantity}
                              </span>
                            ))
                          )}
                        </div>

                        <div className="mt-auto pt-4 flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {items.length} lines • {itemCount} pcs total
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(bundle)}
                              className="inline-flex items-center rounded-lg bg-white text-blue-700 px-3 py-1.5 text-xs font-medium ring-1 ring-blue-200 hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(bundle._id)}
                              className="inline-flex items-center rounded-lg bg-white text-red-700 px-3 py-1.5 text-xs font-medium ring-1 ring-red-200 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BundlesPage;