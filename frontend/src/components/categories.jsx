import React, { useEffect, useState } from "react";
import axios from "axios";

const Categories = () => {
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCategory, setEditCategory ] = useState(null)

  const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:5000/api/category", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          },
        });
        console.log(response.data.categories);
        setCategories(response.data.categories);
      } catch (error) {
        console.error("Error in fetching categories", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => { 
    fetchCategories();
  }, []);

  const handleSumbit = async (e) => {
    e.preventDefault();
    if (editCategory) {
      const response = await axios.put(
        `http://localhost:5000/api/category/${editCategory}`,
        { categoryName, categoryDescription },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          },
        }
      );

      if (response.data.success) {
        setEditCategory(null)
        alert("Category edited successfully!");
        fetchCategories()
       
      } else {
        alert("Error editing category. Please try again.");
    }
  } else {

    
      const response = await axios.post(
        "http://localhost:5000/api/category/add",
        { categoryName, categoryDescription },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          },
        }
      );

      if (response.data.success) {
        alert("Category added successfully!");
        setCategoryName("");
        setCategoryDescription("");

        // Refresh list after adding
        setCategories((prev) => [
          ...prev,
          { categoryName, categoryDescription },
        ]);
      } else {
        alert("Error adding category. Please try again.");
      }
  }
  };
  const handleEdit = async (cat) => {
    setEditCategory(cat._id)
    setCategoryName(cat.categoryName)
    setCategoryDescription(cat.categoryDescription)
    
  }

  const handleCancel = async () => {
    setEditCategory(null);
    setCategoryName("")
    setCategoryDescription("")
  }


  if (loading) return <div>Loading...</div>;
  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Category Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Category Form */}
        <div className="bg-white rounded-lg shadow-md p-4" style={{ height: "290px", overflowY: "auto" }}>
          <h2 className="text-lg font-semibold mb-3 text-gray-700">{editCategory ? "Edit Category" : "Add Category"}</h2>
          <form className="space-y-4" onSubmit={handleSumbit}>
            <input
              type="text"
              placeholder="Category Name"
              value={categoryName}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-300"
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Category Description"
              value={categoryDescription}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-green-300"
              onChange={(e) => setCategoryDescription(e.target.value)}
            />
            <div className="gap-2">
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              {editCategory ? "save Changes " : "Add Category"}
            </button>
            {
              editCategory && (
                <button
                type="button"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                onClick={handleCancel}
                >
                  cancel
                </button>
              )
            }
            </div>
          </form>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Existing Categories</h2>
          {categories.length === 0 ? (
            <p className="text-gray-500">No categories added yet.</p>
          ) : (
            <table className="min-w-full border-collapse rounded-lg overflow-hidden">
              <thead className="bg-green-600 text-white">
                <tr>
                  <th className="py-3 px-6 text-left font-semibold">S No</th>
                  <th className="py-3 px-6 text-left font-semibold">Category Name</th>
                  <th className="py-3 px-6 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, index) => (
                  <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
                    <td className="py-4 px-6 text-center">{index + 1}</td>
                    <td className="py-4 px-6">{cat.categoryName}</td>
                    <td className="py-4 px-6 text-center">
                      <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg mr-2 text-sm"onClick={() => handleEdit(cat)}
                        > Edit
                        
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg text-sm" >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;