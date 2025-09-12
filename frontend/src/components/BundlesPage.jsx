import React, { useState, useEffect } from "react";
import axios from "axios";

const BundlesPage = () => {
  const [bundles, setBundles] = useState([]);
  const [bundleName, setBundleName] = useState("");
  const [bundleDescription, setBundleDescription] = useState("");
  const [bundlePrice, setBundlePrice] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]); // [{ product, quantity }]
  const [products, setProducts] = useState([]); // all products fetched
  const [editBundle, setEditBundle] = useState(null);

  // Fetch bundles
  const fetchBundles = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/bundles", {
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
      const response = await axios.get("http://localhost:5000/api/products", {
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

  // Handle create / update bundle
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: bundleName,
      description: bundleDescription,
      price: Number(bundlePrice),
      products: selectedProducts.map((p) => ({ product: p.product, quantity: Number(p.quantity) || 1 })),
    };

    try {
      let response;
      if (editBundle) {
        response = await axios.put(
          `http://localhost:5000/api/bundles/${editBundle}`,
          payload,
          { headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` } }
        );
        setBundles((prev) =>
          prev.map((b) => (b._id === editBundle ? response.data.bundle : b))
        );
        alert("Bundle updated successfully!");
      } else {
        response = await axios.post("http://localhost:5000/api/bundles", payload, {
          headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
        });
        setBundles((prev) => [...prev, response.data.bundle]);
        alert("Bundle created successfully!");
      }

      // Reset form
      setBundleName("");
      setBundleDescription("");
      setBundlePrice("");
      setSelectedProducts([]);
      setEditBundle(null);
    } catch (error) {
      console.error("Error submitting bundle:", error.response?.data ?? error);
      alert(`Error creating/updating bundle: ${error.response?.data?.message ?? "Check console."}`);
    }
  };

  // Handle edit
  const handleEdit = (bundle) => {
    setEditBundle(bundle._id);
    setBundleName(bundle.name);
    setBundleDescription(bundle.description);
    setBundlePrice(bundle.price);
    setSelectedProducts((bundle.products ?? []).map((p) => ({
      product: p.product._id ?? p.product,
      quantity: p.quantity,
    })));
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this bundle?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/bundles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("pos-token")}` },
      });
      setBundles((prev) => prev.filter((b) => b._id !== id));
      alert("Bundle deleted successfully!");
    } catch (error) {
      console.error("Error deleting bundle:", error);
      alert("Error deleting bundle.");
    }
  };

  // Product selection handlers
  const handleProductChange = (e, index) => {
    const value = e.target.value;
    setSelectedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, product: value } : p))
    );
  };

  const handleQuantityChange = (e, index) => {
    const value = Number(e.target.value) || 1;
    setSelectedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, quantity: value } : p))
    );
  };

  const addProductField = () => setSelectedProducts((prev) => [...prev, { product: "", quantity: 1 }]);
  const removeProductField = (index) => setSelectedProducts((prev) => prev.filter((_, i) => i !== index));

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Bundle Management</h1>

      {/* ---------- Bundle Form ---------- */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">{editBundle ? "Edit Bundle" : "Create Bundle"}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Bundle Name"
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={bundleDescription}
            onChange={(e) => setBundleDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number"
            placeholder="Price"
            value={bundlePrice}
            onChange={(e) => setBundlePrice(e.target.value)}
            className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="space-y-2">
            <h3 className="font-semibold">Products in Bundle</h3>
            {selectedProducts.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <select
                  value={p.product}
                  onChange={(e) => handleProductChange(e, idx)}
                  className="flex-1 border px-2 py-1 rounded-lg"
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
                  value={p.quantity}
                  min={1}
                  onChange={(e) => handleQuantityChange(e, idx)}
                  className="w-20 border px-2 py-1 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeProductField(idx)}
                  className="bg-red-600 text-white px-2 rounded hover:bg-red-700"
                >
                  X
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addProductField}
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            >
              Add Product
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg mt-4"
          >
            {editBundle ? "Save Changes" : "Create Bundle"}
          </button>
        </form>
      </div>

      {/* ---------- Bundles Table ---------- */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Existing Bundles</h2>
        {bundles.length === 0 ? (
          <p className="text-gray-500">No bundles added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="py-2 px-4">#</th>
                  <th className="py-2 px-4">Bundle Name</th>
                  <th className="py-2 px-4">Price</th>
                  <th className="py-2 px-4">Products</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bundles.map((bundle, idx) => (
                  <tr key={bundle._id} className="hover:bg-gray-50 border-b">
                    <td className="py-2 px-4 text-center">{idx + 1}</td>
                    <td className="py-2 px-4">{bundle.name}</td>
                    <td className="py-2 px-4">{bundle.price}</td>
                    <td className="py-2 px-4">
                      {(bundle.products ?? []).map((p) => p.product?.name ?? p.product).join(", ")}
                    </td>
                    <td className="py-2 px-4 flex gap-2">
                      <button
                        onClick={() => handleEdit(bundle)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(bundle._id)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundlesPage;