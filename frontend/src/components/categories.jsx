import React, { useEffect, useState } from "react";
import axios from "axios";
import BundlesPage from "./BundlesPage";
import { VITE_API_BASE } from "../config"

const API = VITE_API_BASE;

// Modal Component
const Modal = ({ isOpen, onClose, title, message, type = "info" }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          {getIcon()}
          
          <div className="mt-3 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Confirm Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          
          <div className="mt-3 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {message}
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 ring-1 ring-gray-300 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Categories = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory] = useState(null);
  const [error, setError] = useState(null);
  
  // Modal states
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, categoryId: null });

  const showModal = (title, message, type = "info") => {
    setModal({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: "", message: "", type: "info" });
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.get(`${API}/category`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      setCategories(response.data.categories || []);
    } catch (error) {
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
      showModal("Validation Error", "Category name is required", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        showModal("Authentication Required", "Please login again.", "warning");
        return;
      }

      if (editCategory) {
        const response = await axios.put(
          `${API}/category/${editCategory}`,
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
          showModal("Success", "Category edited successfully!", "success");
          fetchCategories();
        } else {
          showModal("Error", response.data.message || "Error editing category. Please try again.", "error");
        }
      } else {
        const response = await axios.post(
          `${API}/category/add`,
          { categoryName: categoryName.trim(), categoryDescription: categoryDescription.trim() },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );

        if (response.data.success) {
          showModal("Success", "Category added successfully!", "success");
          setCategoryName("");
          setCategoryDescription("");
          fetchCategories();
        } else {
          showModal("Error", response.data.message || "Error adding category. Please try again.", "error");
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "An error occurred";
      showModal("Error", errorMsg, "error");
      
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
    setConfirmModal({ isOpen: true, categoryId: id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.categoryId;
    setConfirmModal({ isOpen: false, categoryId: null });

    try {
      const token = localStorage.getItem("pos-token");
      
      if (!token) {
        showModal("Authentication Required", "Please login again.", "warning");
        return;
      }

      const response = await axios.delete(
        `${API}/category/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        }
      );

      if (response.data.success) {
        showModal("Success", "Category deleted successfully!", "success");
        fetchCategories();
      } else {
        showModal("Error", response.data.message || "Error deleting category. Please try again.", "error");
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || "An error occurred";
      showModal("Error", `Error deleting category: ${errorMsg}`, "error");
      
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
    <>
      <Modal 
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, categoryId: null })}
        onConfirm={confirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />

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
    </>
  );
};

export default Categories;