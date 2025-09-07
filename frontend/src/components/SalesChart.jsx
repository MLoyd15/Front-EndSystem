import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const SalesChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/orders", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos-token")}`,
          },
        });

        // Group by day
        const grouped = response.data.orders.reduce((acc, order) => {
          const date = new Date(order.createdAt).toLocaleDateString();
          acc[date] = (acc[date] || { revenue: 0, units: 0 });
          acc[date].revenue += order.totalAmount;
          order.products.forEach((p) => (acc[date].units += p.quantity));
          return acc;
        }, {});

        const chartData = Object.keys(grouped).map((date) => ({
          date,
          revenue: grouped[date].revenue,
          units: grouped[date].units,
        }));

        setData(chartData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-10">
      {/* Chart on left side (80%) */}
      <div className="lg:col-span-4 bg-white rounded-2xl shadow-md p-6 border-4 border-green-500">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          📊 Sales Trends (Revenue & Units Sold)
        </h2>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              formatter={(value, name) =>
                name === "Revenue"
                  ? [`$${value.toFixed(2)}`, name]
                  : [value, name]
              }
            />
            <Legend />
            <Line
              name="Revenue"
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
            <Line
              name="Units Sold"
              type="monotone"
              dataKey="units"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Placeholder for top-selling products (20%) */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow-md p-6 flex items-center justify-center border-4 border-green-500">
        <p className="text-gray-500">📦 Top Selling Products (Coming Soon)</p>
      </div>
    </div>
  );
};

export default SalesChart;