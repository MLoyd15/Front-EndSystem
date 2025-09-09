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
    avgOrderValue: 0,
    loyaltyPoints: 0,   // ✅ new
    loyaltyTier: "Sprout" // ✅ new
  })

useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });
      setStats((prev) => ({ ...prev, ...response.data })); // merge
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const fetchLoyalty = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/loyalty", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
        },
      });
      setStats((prev) => ({
        ...prev,
        loyaltyPoints: response.data.loyaltyPoints,
        loyaltyTier: response.data.loyaltyTier,
      }));
    } catch (err) {
      console.error("Error fetching loyalty", err);
    }
  };

  fetchStats();
  fetchLoyalty();
}, []);
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
       <div className="mt-8 bg-white shadow rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4">🎁 Loyalty History</h2>
      {stats.loyaltyHistory?.length ? (
        <ul className="space-y-2">
          {stats.loyaltyHistory.map((entry, i) => (
            <li key={i} className="flex justify-between text-sm">
              <span>{entry.action.toUpperCase()}</span>
              <span>{entry.points} pts</span>
              <span>{new Date(entry.date).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">No loyalty activity yet.</p>
      )}
    </div>
    </div>
  )
}

export default AdminKpi