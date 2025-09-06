import React, { useEffect, useState } from 'react'
import axios from "axios"
import KpiCard from './kpicard'
import { FaUsers, FaDollarSign, FaShoppingCart, FaBoxes } from "react-icons/fa"

const AdminKpi = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCategories: 0,
    inventorySales: 0,
    lowStock: 0,
    inventoryStock: 0
  })

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/category", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          },
        })

        // ✅ only update totalCategories, keep the rest unchanged
        setStats(prev => ({
          ...prev,
          totalCategories: response.data.categories.length
        }))
      } catch (err) {
        console.error("Error fetching categories", err)
      }
    }

    fetchCategories()
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Overview */}
      <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard title="Total Users" value={stats.totalUsers} icon={<FaUsers />} color="bg-blue-500" />
        <KpiCard title="Total Sales" value={stats.totalSales} icon={<FaShoppingCart />} color="bg-green-500" />
        <KpiCard title="Total Revenue" value={`$${stats.totalRevenue}`} icon={<FaDollarSign />} color="bg-purple-500" />
      </div>

      {/* Inventory Details */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Inventory Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard title="Total Categories" value={stats.totalCategories} icon={<FaBoxes />} color="bg-orange-500" />
        <KpiCard title="Inventory Sales" value={stats.inventorySales} icon={<FaShoppingCart />} color="bg-teal-500" />
        <KpiCard title="Low Stock" value={stats.lowStock} icon={<FaBoxes />} color="bg-red-500" />
        <KpiCard title="Inventory Stock" value={stats.inventoryStock} icon={<FaBoxes />} color="bg-indigo-500" />
      </div>
    </div>
  )
}

export default AdminKpi