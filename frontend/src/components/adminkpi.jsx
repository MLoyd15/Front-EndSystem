import React, { useEffect, useState } from 'react'
import axios from "axios"
import KpiCard from './kpicard'
import { FaUsers, FaDollarSign, FaShoppingCart, FaBoxes } from "react-icons/fa"
import SalesChart from "./SalesChart"; 

const AdminKpi = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCategories: 0,
    inventorySales: 0,
    lowStock: 0,
    inventoryStock: 0,
    orderVolume: 0,     
    avgOrderValue: 0
  })

useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      })
      setStats(response.data) // ✅ set all totals at once
    } catch (err) {
      console.error("Error fetching stats", err)
    }
  }

  fetchStats() // ✅ actually call the function
}, [])

  return (
    <div className="p-6 space-y-6">
      {/* Dashboard Overview */}
      <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard title="Total Users" value={stats.totalUsers} icon={<FaUsers />} color="bg-green-500" />
        <KpiCard title="Total Sales" value={stats.totalSales} icon={<FaShoppingCart />} color="bg-green-500" />
        <KpiCard title="Total Revenue" value={stats.totalRevenue} icon={<FaDollarSign />} color="bg-green-500" />
        <KpiCard title="Order Volume" value={stats.orderVolume} icon={<FaShoppingCart />} color="bg-green-500" /> {/* ✅ new */}
        <KpiCard title="Avg Order Value"value={`$${stats.avgOrderValue}`}icon={<FaDollarSign />} color="bg-green-500"
/>
      </div>

      {/* Inventory Details */}
      <h2 className="text-2xl font-bold mt-8 mb-4">Inventory Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <KpiCard title="Total Categories" value={stats.totalCategories} icon={<FaBoxes />} color="bg-green-500" />
        <KpiCard title="Inventory Sales" value={stats.inventorySales} icon={<FaShoppingCart />} color="bg-green-500" />
        <KpiCard title="Low Stock" value={stats.lowStock} icon={<FaBoxes />} color="bg-green-500" />
        <KpiCard title="Inventory Stock" value={stats.inventoryStock} icon={<FaBoxes />} color="bg-green-500" />
      </div>

           {/* Sales Chart */}
        <div className="mt-10">
        <SalesChart />
      </div>
    </div>
  )
}

export default AdminKpi