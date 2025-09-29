import React, { useEffect, useState } from "react";
import axios from "axios";
import BundlesPage from "./BundlesPage";
import { VITE_API_BASE } from "../config"

const API = VITE_API_BASE;

const Categories = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.get(`${API}/api/category`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      console.log("Categories response:", response.data);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      const errorMsg = error.response?.data?.message || error.message || "Error fetching categories";
      setError(errorMsg);
      
      // If unauthorized, clear token
      if (error.response?.status === 401) {
        localStorage.removeItem("pos-token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSumbit = async (e) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      alert("Category name is required");
      return;
    }

    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }

      if (editCategory) {
        const response = await axios.put(
          `${API}/api/category/${editCategory}`,
          { categoryName: categoryName.trim(), categoryDescription: categoryDescription.trim() },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );

        if (response.data.success) {
          setEditCategory(null);
          setCategoryName("");
          setCategoryDescription("");
          alert("Category edited successfully!");
          fetchCategories();
        } else {
          alert(response.data.message || "Error editing category. Please try again.");
        }
      } else {
        const response = await axios.post(
          `${API}/api/category/add`,
          { categoryName: categoryName.trim(), categoryDescription: categoryDescription.trim() },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );

        if (response.data.success) {
          alert("Category added successfully!");
          setCategoryName("");
          setCategoryDescription("");
          fetchCategories();
        } else {
          alert(response.data.message || "Error adding category. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error submitting category:", error);
      const errorMsg = error.response?.data?.message || error.message || "An error occurred";
      alert(`Error: ${errorMsg}`);
      
      if (error.response?.status === 401) {
        localStorage.removeItem("pos-token");
        window.location.href = "/login";
      }
    }
  };

  const handleEdit = async (cat) => {
    setEditCategory(cat._id);
    setCategoryName(cat.categoryName);
    setCategoryDescription(cat.categoryDescription || "");
  };

  const handleCancel = async () => {
    setEditCategory(null);
    setCategoryName("");
    setCategoryDescription("");
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this category?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        alert("Authentication required. Please login again.");
        return;
      }

      const response = await axios.delete(
        `${API}/api/category/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );

      if (response.data.success) {
        alert("Category deleted successfully!");
        fetchCategories();
      } else {
        alert(response.data.message || "Error deleting category. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      const errorMsg = error.response?.data?.message || error.message || "An error occurred";
      alert(`Error deleting category: ${errorMsg}`);
      
      if (error.response?.status === 401) {
        localStorage.removeItem("pos-token");
        window.location.href = "/login";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-emerald-500 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Categories</h3>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={fetchCategories}
              className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Category Management</h1>
          <p className="text-sm text-gray-500">Create, edit, and organize your product categories.</p>
        </div>
        <div className="text-sm text-gray-500">
          Total categories:{" "}
          <span className="font-medium text-gray-900">{categories?.length ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add / Edit Category */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              {editCategory ? "Edit Category" : "Add Category"}
            </h2>
            {editCategory && (
              <span className="text-xs rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                Editing
              </span>
            )}
          </div>

          <form className="p-4 space-y-4" onSubmit={handleSumbit}>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Beverages"
                value={categoryName}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                placeholder="Optional short description"
                value={categoryDescription}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                onChange={(e) => setCategoryDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="submit"
                className="inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition"
              >
                {editCategory ? "Save Changes" : "Add Category"}
              </button>

              {editCategory && (
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

        {/* Categories List */}
        <div className="rounded-2xl bg-white shadow-md ring-1 ring-black/5">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Existing Categories</h2>
            <span className="text-xs text-gray-500">
              {categories?.length || 0} item{(categories?.length || 0) === 1 ? "" : "s"}
            </span>
          </div>

          {/* Table container with sticky header and scroll */}
          <div className="max-h-[420px] overflow-auto">
            {(!categories || categories.length === 0) ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 grid place-items-center mb-2">
                  <span className="text-gray-400">🗂️</span>
                </div>
                <p className="text-sm text-gray-500">No categories added yet.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-4 font-medium">#</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((cat, index) => (
                    <tr key={cat._id ?? index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 w-12 text-gray-500 tabular-nums">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{cat.categoryName}</div>
                        {cat.categoryDescription ? (
                          <div className="text-xs text-gray-500 line-clamp-1">{cat.categoryDescription}</div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(cat)}
                            className="inline-flex items-center rounded-lg bg-white text-blue-700 px-3 py-1.5 text-xs font-medium ring-1 ring-blue-200 hover:bg-blue-50"
                            title="Edit"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-lg bg-white text-red-700 px-3 py-1.5 text-xs font-medium ring-1 ring-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(cat._id)}
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 mt-8 w-full">
          <h2 className="text-xl font-semibold text-gray-900 mb-4"></h2>
          <BundlesPage />
        </div>
      </div>
    </div>
  );
};

export default Categories;