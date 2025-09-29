import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { VITE_API_BASE } from "../config"

const API = VITE_API_BASE;

const peso = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 })
    : "—";

const BundlesPage = () => {
  const [bundles, setBundles] = useState([]);
  const [bundleName, setBundleName] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [editBundle, setEditBundle] = useState(null);

  const formTopRef = useRef(null);
  const nameInputRef = useRef(null);

  // Fetch bundles
  const fetchBundles = async () => {
    try {
      const response = await axios.get(`${API}/bundles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      const bundlesArray = Array.isArray(response.data)
        ? response.data
        : response.data.bundles ?? response.data.items ?? [];
      setBundles(bundlesArray);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      setBundles([]);
    }
  };

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/bundles`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      const fetchedProducts = Array.isArray(response.data)
        ? response.data
        : response.data.items ?? [];
      setProducts(fetchedProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
    }
  };

  useEffect(() => {
    fetchBundles();
    fetchProducts();
  }, []);
  
  // Edit Bundle
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: bundleName,
      description: bundleDescription,
      price: Number(bundlePrice),
      products: selectedProducts.map((p) => ({
        product: p.product,
        quantity: Number(p.quantity) || 1,
      })),
    };

    try {
      if (editBundle) {
        await axios.put(`${API}/bundles/${editBundle}`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
        });
        alert("Bundle updated successfully!");
      } else {
        await axios.post(`${API}/bundles`, payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
        });
        alert("Bundle created successfully!");
      }

      fetchBundles();
      handleCancel(); 
    } catch (error) {
      console.error("Error submitting bundle:", error.response?.data ?? error);
      alert(`Error creating/updating bundle: ${error.response?.data?.message ?? "Check console."}`);
    }
  };

  const handleEdit = (bundle) => {
    setEditBundle(bundle._id);
    setBundleName(bundle.name);
    setBundleDescription(bundle.description ?? "");
    setBundlePrice(bundle.price ?? "");
    setSelectedProducts((bundle.products ?? []).map((p) => ({
      product: p.product._id ?? p.product,
      quantity: p.quantity,
    })));

    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameInputRef.current?.focus({ preventScroll: true });
    });
  };

  // Delete Bundle
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bundle?")) return;
    try {
      await axios.delete(`${API}/bundles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      fetchBundles();
      alert("Bundle deleted successfully!");
    } catch (error) {
      console.error("Error deleting bundle:", error);
      alert("Error deleting bundle.");
    }
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

  const totalBundles = useMemo(() => bundles.length, [bundles]);

  // Keep edited bundle on top
  const displayedBundles = useMemo(() => {
    if (!editBundle) return bundles;
    const idx = bundles.findIndex((b) => b._id === editBundle);
    if (idx === -1) return bundles;
    return [bundles[idx], ...bundles.slice(0, idx), ...bundles.slice(idx + 1)];
  }, [bundles, editBundle]);

  return (
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
              <label className="block text-sm font-medium mb-1">Bundle Name</label>
              <input
                ref={nameInputRef}
                type="text"
                placeholder="e.g. Starter Pack"
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
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
              <label className="block text-sm font-medium mb-1">Price</label>
              <input
                type="number"
                placeholder="0.00"
                value={bundlePrice}
                onChange={(e) => setBundlePrice(e.target.value)}
                className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold">Products in Bundle</label>
                <button
                  type="button"
                  onClick={addProductField}
                  className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
                >
                  Add Product
                </button>
              </div>

              <div className="space-y-2">
                {selectedProducts.map((p, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select
                      value={p.product}
                      onChange={(e) => handleProductChange(e, idx)}
                      className="flex-1 border px-3 py-2 rounded-lg"
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
                ))}
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
              <p className="text-gray-500 text-center py-12">No bundles added yet.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:[grid-template-columns:repeat(auto-fit,minmax(300px,1fr))] gap-4">
                {displayedBundles.map((bundle) => {
                  const items = bundle.products ?? [];
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
                              {(p.product?.name ?? p.product)} × {p.quantity}
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
  );
};

export default BundlesPage;

